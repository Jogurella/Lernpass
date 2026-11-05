#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{collections::BTreeMap, fs, path::PathBuf, sync::Mutex, time::{SystemTime,UNIX_EPOCH}};
use tauri::{Manager,State};
use serde::Serialize;
use base64::{engine::general_purpose::STANDARD,Engine};
use tauri_plugin_updater::UpdaterExt;

struct AppState { directory:PathBuf, writing:Mutex<()> }
fn error(value:impl std::fmt::Display)->String { value.to_string() }
fn storage(state:&AppState)->PathBuf { state.directory.join("storage.json") }
fn read_values(state:&AppState)->Result<BTreeMap<String,String>,String>{let file=storage(state);if !file.exists(){return Ok(BTreeMap::new());}serde_json::from_slice(&fs::read(file).map_err(error)?).map_err(|_|"Die lokale Datei ist beschädigt. Bitte eine Sicherung wiederherstellen.".into())}
fn server(state:&AppState)->Result<String,String>{read_values(state)?.get("lernpass.server").cloned().filter(|s|!s.is_empty()).ok_or("Verbinde zuerst einen Lernpass-Server.".into())}
fn validate_url(value:&str)->Result<String,String>{let url=url::Url::parse(value).map_err(|_|"Ungültige Serveradresse.")?;if !url.username().is_empty()||url.password().is_some()||url.query().is_some()||url.fragment().is_some()||url.path()!="/"{return Err("Bitte die reine Serveradresse eingeben.".into());}if url.scheme()!="https"&&!(url.scheme()=="http"&&matches!(url.host_str(),Some("127.0.0.1"|"localhost"))){return Err("Die Serveradresse muss HTTPS verwenden.".into());}Ok(url.origin().ascii_serialization())}
fn credential(state:&AppState)->Result<keyring::Entry,String>{keyring::Entry::new("at.lernpass.mec",&server(state)?).map_err(error)}
#[tauri::command]fn load_storage(state:State<AppState>)->Result<BTreeMap<String,String>,String>{read_values(&state)}
#[tauri::command]fn save_storage(values:BTreeMap<String,String>,state:State<AppState>)->Result<(),String>{let _guard=state.writing.lock().map_err(error)?;let bytes=serde_json::to_vec(&values).map_err(error)?;if bytes.len()>12*1024*1024{return Err("Der lokale Speicher ist voll. Exportiere eine Sicherung.".into());}let target=storage(&state);let pending=state.directory.join("storage.next.json");fs::write(&pending,bytes).map_err(error)?;if target.exists(){fs::copy(&target,state.directory.join("storage.previous.json")).map_err(error)?;}fs::rename(&pending,target).map_err(error)?;Ok(())}
#[tauri::command]fn configure_server(url:String,state:State<AppState>)->Result<(),String>{let url=validate_url(&url)?;let mut values=read_values(&state)?;values.insert("lernpass.server".into(),url);save_storage(values,state)}
#[tauri::command]fn has_token(state:State<AppState>)->bool{credential(&state).ok().and_then(|e|e.get_password().ok()).is_some()}
#[tauri::command]fn clear_token(state:State<AppState>)->Result<(),String>{match credential(&state)?.delete_credential(){Ok(())|Err(keyring::Error::NoEntry)=>Ok(()),Err(e)=>Err(error(e))}}
#[tauri::command]fn backup_storage(state:State<AppState>)->Result<String,String>{let path=state.directory.join("Backups");fs::create_dir_all(&path).map_err(error)?;let stamp=SystemTime::now().duration_since(UNIX_EPOCH).map_err(error)?.as_secs();let file=path.join(format!("Lernpass-{stamp}.json"));let values=read_values(&state)?;fs::write(&file,serde_json::to_vec_pretty(&values).map_err(error)?).map_err(error)?;Ok(file.to_string_lossy().to_string())}
#[derive(Serialize)]#[serde(rename_all="camelCase")]struct ApiReply{status:u16,headers:BTreeMap<String,String>,body_base64:String,paired:bool}
#[tauri::command]async fn api_request(path:String,method:String,body:Option<String>,body_base64:Option<String>,content_type:Option<String>,case_id:Option<String>,image_name:Option<String>,state:State<'_,AppState>)->Result<ApiReply,String>{
 if !path.starts_with("/api/")||path.contains("..")||path.chars().any(|c|!(c.is_ascii_alphanumeric()||"/_-".contains(c))){return Err("Ungültiger App-Aufruf.".into());}
 if !["GET","HEAD","POST","PUT","DELETE"].contains(&method.as_str()){return Err("Ungültige Methode.".into());}
 let origin=validate_url(&server(&state)?)?;let token=credential(&state)?.get_password().ok();
 let client=reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).timeout(std::time::Duration::from_secs(55)).build().map_err(error)?;
 let mut request=client.request(reqwest::Method::from_bytes(method.as_bytes()).map_err(error)?,format!("{origin}{path}"));
 if let Some(token)=token {request=request.bearer_auth(token);}
 if let Some(mime)=content_type {request=request.header("Content-Type",mime);}
 if let Some(id)=case_id {request=request.header("X-Case-Id",id);}
 if let Some(name)=image_name {request=request.header("X-Image-Name",name);}
 let bytes=if let Some(data)=body_base64{STANDARD.decode(data).map_err(error)?}else{body.unwrap_or_default().into_bytes()};if bytes.len()>5*1024*1024{return Err("Die Datei ist zu groß.".into());}if !bytes.is_empty(){request=request.body(bytes);}
 let response=request.send().await.map_err(|_|"Der Server ist nicht erreichbar. Dein Stand bleibt auf diesem Gerät.".to_string())?;let status=response.status().as_u16();let headers=response.headers().iter().filter_map(|(k,v)|v.to_str().ok().map(|v|(k.as_str().to_string(),v.to_string()))).collect();
 let mut bytes=response.bytes().await.map_err(error)?.to_vec();if bytes.len()>8*1024*1024{return Err("Die Serverantwort ist zu groß.".into());}let mut paired=false;
 if status==201&&(path=="/api/account"||path=="/api/pair/claim") {let mut value:serde_json::Value=serde_json::from_slice(&bytes).map_err(error)?;if let Some(token)=value.get("token").and_then(|v|v.as_str()).map(str::to_string){if token.len()!=64||!token.chars().all(|c|c.is_ascii_hexdigit()){return Err("Ungültige Gerätekennung.".into());}credential(&state)?.set_password(&token).map_err(|_|"Die Gerätekennung konnte nicht in der Windows-Anmeldeinformationsverwaltung gespeichert werden.".to_string())?;value.as_object_mut().unwrap().remove("token");bytes=serde_json::to_vec(&value).map_err(error)?;paired=true;}}
 Ok(ApiReply{status,headers,body_base64:STANDARD.encode(bytes),paired})
}
#[tauri::command]fn window_action(action:String,app:tauri::AppHandle)->Result<(),String>{let window=app.get_webview_window("main").ok_or("Fenster nicht verfügbar.")?;match action.as_str(){"minimize"=>window.minimize().map_err(error),"maximize"=>{if window.is_maximized().map_err(error)?{window.unmaximize().map_err(error)}else{window.maximize().map_err(error)}},"close"=>window.close().map_err(error),_=>Err("Unbekannte Fensteraktion.".into())}}
#[tauri::command]fn open_external(url:String)->Result<(),String>{let parsed=url::Url::parse(&url).map_err(error)?;if !["https","http"].contains(&parsed.scheme()){return Err("Dieser Linktyp ist nicht erlaubt.".into());}open::that_detached(url).map_err(error)}
#[tauri::command]async fn export_file(name:String,body_base64:String,mime:String)->Result<bool,String>{if name.contains(['/', '\\'])||name.len()>180{return Err("Ungültiger Dateiname.".into());}let extension=if mime=="text/html"{"html"}else{"json"};let file=rfd::AsyncFileDialog::new().set_file_name(name).add_filter("Lernpass-Datei",&[extension]).save_file().await;if let Some(file)=file{let bytes=STANDARD.decode(body_base64).map_err(error)?;file.write(&bytes).await.map_err(error)?;Ok(true)}else{Ok(false)}}
#[tauri::command]async fn app_update(action:String,app:tauri::AppHandle,state:State<'_,AppState>)->Result<serde_json::Value,String>{
 let config=app.config();let configured=config.plugins.0.get("updater").and_then(|v|v.get("pubkey")).and_then(|v|v.as_str()).is_some_and(|v|!v.is_empty());if !configured{return Ok(serde_json::json!({"configured":false,"available":false}));}
 let updater=app.updater().map_err(error)?;let update=updater.check().await.map_err(|_|"Der Updatekanal ist momentan nicht erreichbar.".to_string())?;
 if let Some(update)=update {
  if update.version.len()>80||!update.version.chars().all(|c|c.is_ascii_alphanumeric()||".-+".contains(c)){return Err("Ungültige Updateversion.".into());}
  let folder=state.directory.join("Updates");fs::create_dir_all(&folder).map_err(error)?;let file=folder.join(format!("update-{}.bin",update.version));
  let cached=fs::read(&file).ok().filter(|bytes|update.verify(bytes).is_ok());
  let bytes=if let Some(bytes)=cached {bytes}else{let bytes=update.download(|_,_|{},||{}).await.map_err(error)?;fs::write(&file,&bytes).map_err(error)?;bytes};
  if action=="install" {backup_storage(state)?;update.install(&bytes).map_err(error)?;app.restart();}
  let version=update.version.clone();let body=update.body.clone();let date=update.date.map(|v|v.to_string());return Ok(serde_json::json!({"configured":true,"available":true,"version":version,"body":body,"date":date,"size":bytes.len()}));
 }
 Ok(serde_json::json!({"configured":true,"available":false}))
}
fn main(){tauri::Builder::default().plugin(tauri_plugin_updater::Builder::new().build()).setup(|app|{let directory=PathBuf::from(std::env::var("APPDATA")?).join("Lernpass");fs::create_dir_all(&directory)?;app.manage(AppState{directory,writing:Mutex::new(())});Ok(())}).invoke_handler(tauri::generate_handler![load_storage,save_storage,configure_server,has_token,clear_token,backup_storage,api_request,window_action,open_external,export_file,app_update]).run(tauri::generate_context!()).expect("Lernpass konnte nicht gestartet werden");}
