import {registerPlugin} from '@capacitor/core';
import {Haptics,ImpactStyle,NotificationType} from '@capacitor/haptics';
import {Keyboard,KeyboardResize} from '@capacitor/keyboard';
import {StatusBar,Style} from '@capacitor/status-bar';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {App} from '@capacitor/app';
import {Capacitor} from '@capacitor/core';
if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios'){
 const Native=registerPlugin('LernpassNative');
 const methods={load_storage:'loadStorage',save_storage:'saveStorage',configure_server:'configureServer',has_token:'hasToken',clear_token:'clearToken',api_request:'apiRequest',backup_storage:'backupStorage',open_external:'openExternal',app_update:'appUpdate'};
 window.LernpassMobile={
  async invoke(command,args={}){
   if(command==='export_file'){const filename=args.name.replace(/[^a-zA-Z0-9_.-]/g,'_');const result=await Filesystem.writeFile({path:filename,data:args.bodyBase64,directory:Directory.Cache});await Share.share({title:args.name,url:result.uri});return true;}
   const value=await Native[methods[command]](args);return command==='load_storage'?value.values:command==='has_token'?value.hasToken:value;
  },
  async haptic(kind){try{if(kind==='success')await Haptics.notification({type:NotificationType.Success});else await Haptics.impact({style:ImpactStyle.Light});}catch{}},
  async signature(){try{return await Native.signatureInfo();}catch{return null;}}
 };
 Keyboard.setResizeMode({mode:KeyboardResize.Native}).catch(()=>{});
 StatusBar.setOverlaysWebView({overlay:true}).catch(()=>{});
 StatusBar.setStyle({style:Style.Default}).catch(()=>{});
 App.addListener('appStateChange',({isActive})=>{if(isActive)window.dispatchEvent(new Event('focus'));});
}
