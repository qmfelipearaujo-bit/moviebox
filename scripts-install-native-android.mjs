import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkgDir = path.join(root, 'android/app/src/main/java/com/moviebox/personal')
fs.mkdirSync(pkgDir, { recursive: true })

const plugin = `package com.moviebox.personal;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.Iterator;

@CapacitorPlugin(name = "MovieNative")
public class MovieNativePlugin extends Plugin {
  private DownloadManager manager() {
    return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
  }

  @PluginMethod
  public void hideSystemBars(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      Window window = getActivity().getWindow();
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        WindowInsetsController controller = window.getInsetsController();
        if (controller != null) {
          controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
          controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
      } else {
        window.getDecorView().setSystemUiVisibility(
          View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
          View.SYSTEM_UI_FLAG_FULLSCREEN |
          View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
          View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
          View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
          View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
      }
      call.resolve();
    });
  }

  @PluginMethod
  public void showSystemBars(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      Window window = getActivity().getWindow();
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        WindowInsetsController controller = window.getInsetsController();
        if (controller != null) controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
      } else {
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
      }
      call.resolve();
    });
  }

  @PluginMethod
  public void startDownload(PluginCall call) {
    String url = call.getString("url");
    String fileName = call.getString("fileName", "moviebox-video.mp4");
    if (url == null || url.trim().isEmpty()) { call.reject("URL ausente"); return; }

    try {
      DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
      request.setAllowedOverMetered(true);
      request.setAllowedOverRoaming(true);
      request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
      request.setTitle(fileName);
      request.setDescription("MovieBox - baixando para assistir offline");

      JSObject headers = call.getObject("headers");
      if (headers != null) {
        Iterator<String> keys = headers.keys();
        while (keys.hasNext()) {
          String key = keys.next();
          Object value = headers.opt(key);
          if (value != null) request.addRequestHeader(key, String.valueOf(value));
        }
      }

      File dir = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES), "MovieBox");
      if (!dir.exists()) dir.mkdirs();
      File target = new File(dir, fileName);
      if (target.exists()) target.delete();
      request.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_MOVIES, "MovieBox/" + fileName);

      long id = manager().enqueue(request);
      JSObject ret = new JSObject();
      ret.put("id", id);
      ret.put("uri", Uri.fromFile(target).toString());
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("Falha ao iniciar download", e);
    }
  }

  @PluginMethod
  public void cancelDownload(PluginCall call) {
    long id = call.getData().optLong("id", -1);
    if (id < 0) { call.reject("ID ausente"); return; }
    int removed = manager().remove(id);
    JSObject ret = new JSObject();
    ret.put("removed", removed);
    call.resolve(ret);
  }

  @PluginMethod
  public void downloadStatus(PluginCall call) {
    long id = call.getData().optLong("id", -1);
    if (id < 0) { call.reject("ID ausente"); return; }

    DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
    try (Cursor cursor = manager().query(query)) {
      JSObject ret = new JSObject();
      if (!cursor.moveToFirst()) {
        ret.put("status", "missing");
        call.resolve(ret);
        return;
      }
      int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
      long bytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
      long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
      String localUri = cursor.getString(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI));
      int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));

      String label = "pending";
      if (status == DownloadManager.STATUS_RUNNING) label = "running";
      else if (status == DownloadManager.STATUS_PAUSED) label = "paused";
      else if (status == DownloadManager.STATUS_SUCCESSFUL) label = "successful";
      else if (status == DownloadManager.STATUS_FAILED) label = "failed";

      ret.put("status", label);
      ret.put("bytes", bytes);
      ret.put("total", total);
      ret.put("uri", localUri);
      ret.put("reason", reason);
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("Falha ao consultar download", e);
    }
  }
}
`;
fs.writeFileSync(path.join(pkgDir, 'MovieNativePlugin.java'), plugin)

const mainPath = path.join(pkgDir, 'MainActivity.java')
let main = fs.readFileSync(mainPath, 'utf8')
if (!main.includes('registerPlugin(MovieNativePlugin.class)')) {
  main = main.replace('public class MainActivity extends BridgeActivity {}', `public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(MovieNativePlugin.class);
    super.onCreate(savedInstanceState);
  }
}`)
  if (!main.includes('registerPlugin(MovieNativePlugin.class)')) {
    main = main.replace('public class MainActivity extends BridgeActivity {', `public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(MovieNativePlugin.class);
    super.onCreate(savedInstanceState);
  }
`)
  }
  fs.writeFileSync(mainPath, main)
}
console.log('MovieNativePlugin instalado em Android.')
