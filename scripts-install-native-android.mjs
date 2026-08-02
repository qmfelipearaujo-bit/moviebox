import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkgDir = path.join(root, 'android/app/src/main/java/com/moviebox/personal')
fs.mkdirSync(pkgDir, { recursive: true })

const plugin = `package com.moviebox.personal;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;

@CapacitorPlugin(name = "MovieNative")
public class MovieNativePlugin extends Plugin {
  private static final AtomicLong NEXT_ID = new AtomicLong(System.currentTimeMillis());
  private static final Map<Long, NativeDownloadTask> TASKS = new ConcurrentHashMap<>();
  private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();

  private static class NativeDownloadTask {
    final long id;
    final String url;
    final File file;
    volatile String status = "pending";
    volatile String reason = "";
    volatile long bytes = 0;
    volatile long total = 0;
    volatile long speedBps = 0;
    volatile boolean cancelled = false;
    volatile HttpURLConnection connection;
    volatile InputStream input;
    volatile Future<?> future;

    NativeDownloadTask(long id, String url, File file) {
      this.id = id;
      this.url = url;
      this.file = file;
    }
  }

  private MainActivity movieActivity() {
    return getActivity() instanceof MainActivity ? (MainActivity) getActivity() : null;
  }

  @PluginMethod
  public void ping(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("ok", true);
    ret.put("version", "1.6.1");
    call.resolve(ret);
  }

  @PluginMethod
  public void setPlayerMode(PluginCall call) {
    boolean active = call.getBoolean("active", false);
    MainActivity activity = movieActivity();
    if (activity != null) {
      activity.runOnUiThread(() -> {
        activity.setMovieBoxPlayerMode(active);
        call.resolve();
      });
    } else {
      MovieBoxWebViewClient.setPlayerMode(active);
      call.resolve();
    }
  }

  @PluginMethod
  public void hideSystemBars(PluginCall call) {
    MainActivity activity = movieActivity();
    if (activity == null) { call.reject("Activity indisponível"); return; }
    activity.runOnUiThread(() -> {
      activity.setMovieBoxImmersive(true);
      call.resolve();
    });
  }

  @PluginMethod
  public void showSystemBars(PluginCall call) {
    MainActivity activity = movieActivity();
    if (activity == null) { call.reject("Activity indisponível"); return; }
    activity.runOnUiThread(() -> {
      activity.setMovieBoxImmersive(false);
      call.resolve();
    });
  }

  @PluginMethod
  public void startDownload(PluginCall call) {
    String source = call.getString("url");
    String fileName = call.getString("fileName", "media-box-video.mp4");
    if (source == null || source.trim().isEmpty()) { call.reject("URL ausente"); return; }
    if (!(source.startsWith("https://") || source.startsWith("http://"))) { call.reject("Somente URL HTTP/HTTPS é suportada"); return; }

    try {
      File base = getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES);
      if (base == null) { call.reject("Armazenamento indisponível"); return; }
      File dir = new File(base, "MediaBox");
      if (!dir.exists() && !dir.mkdirs()) { call.reject("Não foi possível criar a pasta de downloads"); return; }
      String safeFileName = fileName.replaceAll("[^A-Za-z0-9._-]", "-");
      if (safeFileName.trim().isEmpty()) safeFileName = "media-box-video.mp4";
      File target = new File(dir, safeFileName);
      if (target.exists()) target.delete();

      long id = NEXT_ID.incrementAndGet();
      NativeDownloadTask task = new NativeDownloadTask(id, source, target);
      TASKS.put(id, task);

      JSObject headers = call.getObject("headers");
      task.future = EXECUTOR.submit(() -> runDownload(task, headers));

      JSObject ret = new JSObject();
      ret.put("id", id);
      ret.put("uri", Uri.fromFile(target).toString());
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("Falha ao iniciar download", e);
    }
  }

  private void runDownload(NativeDownloadTask task, JSObject headers) {
    long speedWindowAt = System.currentTimeMillis();
    long speedWindowBytes = 0;
    try {
      if (task.cancelled) throw new InterruptedException("cancelled");
      URL parsed = new URL(task.url);
      HttpURLConnection connection = (HttpURLConnection) parsed.openConnection();
      task.connection = connection;
      connection.setInstanceFollowRedirects(true);
      connection.setConnectTimeout(20000);
      connection.setReadTimeout(30000);
      connection.setRequestMethod("GET");
      connection.setRequestProperty("Accept-Encoding", "identity");

      if (headers != null) {
        Iterator<String> keys = headers.keys();
        while (keys.hasNext()) {
          String key = keys.next();
          Object value = headers.opt(key);
          if (value != null) connection.setRequestProperty(key, String.valueOf(value));
        }
      }

      connection.connect();
      int code = connection.getResponseCode();
      if (code < 200 || code >= 300) throw new RuntimeException("HTTP " + code);
      task.total = Math.max(0, connection.getContentLengthLong());
      task.status = "running";

      task.input = new BufferedInputStream(connection.getInputStream(), 256 * 1024);
      try (BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(task.file), 256 * 1024)) {
        byte[] buffer = new byte[256 * 1024];
        int read;
        while ((read = task.input.read(buffer)) != -1) {
          if (task.cancelled || Thread.currentThread().isInterrupted()) throw new InterruptedException("cancelled");
          output.write(buffer, 0, read);
          task.bytes += read;
          speedWindowBytes += read;
          long now = System.currentTimeMillis();
          long elapsed = now - speedWindowAt;
          if (elapsed >= 500) {
            task.speedBps = Math.max(0, (speedWindowBytes * 1000L) / elapsed);
            speedWindowAt = now;
            speedWindowBytes = 0;
          }
        }
        output.flush();
      }

      if (task.cancelled) throw new InterruptedException("cancelled");
      task.speedBps = 0;
      task.status = "successful";
    } catch (InterruptedException e) {
      task.status = "cancelled";
      task.reason = "cancelled";
      if (task.file.exists()) task.file.delete();
      Thread.currentThread().interrupt();
    } catch (Exception e) {
      if (task.cancelled) {
        task.status = "cancelled";
        task.reason = "cancelled";
      } else {
        task.status = "failed";
        task.reason = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
      }
      if (task.file.exists()) task.file.delete();
    } finally {
      try { if (task.input != null) task.input.close(); } catch (Exception ignored) {}
      try { if (task.connection != null) task.connection.disconnect(); } catch (Exception ignored) {}
      task.input = null;
      task.connection = null;
    }
  }

  @PluginMethod
  public void cancelDownload(PluginCall call) {
    long id = call.getData().optLong("id", -1);
    if (id < 0) { call.reject("ID ausente"); return; }

    NativeDownloadTask task = TASKS.get(id);
    boolean cancelled = false;
    if (task != null) {
      task.cancelled = true;
      task.status = "cancelling";
      try { if (task.input != null) task.input.close(); } catch (Exception ignored) {}
      try { if (task.connection != null) task.connection.disconnect(); } catch (Exception ignored) {}
      if (task.future != null) task.future.cancel(true);
      if (task.file.exists()) task.file.delete();
      cancelled = true;
    } else {
      // Compatibilidade com downloads criados por versões anteriores que usavam DownloadManager.
      try {
        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        cancelled = manager != null && manager.remove(id) > 0;
      } catch (Exception ignored) {}
    }

    JSObject ret = new JSObject();
    ret.put("cancelled", cancelled);
    call.resolve(ret);
  }

  @PluginMethod
  public void downloadStatus(PluginCall call) {
    long id = call.getData().optLong("id", -1);
    if (id < 0) { call.reject("ID ausente"); return; }
    NativeDownloadTask task = TASKS.get(id);
    JSObject ret = new JSObject();
    if (task == null) {
      ret.put("status", "missing");
      call.resolve(ret);
      return;
    }
    ret.put("status", task.status);
    ret.put("bytes", task.bytes);
    ret.put("total", task.total);
    ret.put("speedBps", task.speedBps);
    ret.put("uri", Uri.fromFile(task.file).toString());
    ret.put("reason", task.reason);
    call.resolve(ret);
  }
}
`;
fs.writeFileSync(path.join(pkgDir, 'MovieNativePlugin.java'), plugin)

const webClient = `package com.moviebox.personal;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MovieBoxWebViewClient extends BridgeWebViewClient {
  private static volatile boolean playerMode = false;

  private static final Set<String> BLOCKED_DOMAINS = new HashSet<>(Arrays.asList(
    "doubleclick.net", "googlesyndication.com", "googleadservices.com", "adservice.google.com",
    "adnxs.com", "appnexus.com", "criteo.com", "criteo.net", "rubiconproject.com",
    "pubmatic.com", "openx.net", "taboola.com", "outbrain.com", "smartadserver.com",
    "casalemedia.com", "contextweb.com", "yieldmo.com", "indexww.com", "33across.com",
    "bidswitch.net", "advertising.com", "exoclick.com", "exosrv.com", "juicyads.com",
    "trafficjunky.net", "popads.net", "popcash.net", "propellerads.com", "onclicka.com",
    "adsterra.com", "monetag.com", "hilltopads.net", "evadav.com", "clickadu.com",
    "zeropark.com", "admaven.com", "mgid.com", "revcontent.com", "richads.com",
    "rollerads.com", "pushground.com"
  ));

  private static final String[] BLOCKED_HOST_PARTS = new String[] {
    "1xbet", "betwinner", "melbet", "mostbet", "popunder", "adserver", "ad-delivery"
  };

  private static final String[] BLOCKED_URL_PARTS = new String[] {
    "/vast", "vast=", "vmap", "adtag", "ad_tag", "preroll", "pre-roll", "midroll",
    "mid-roll", "postroll", "post-roll", "googleima", "ima3", "/ads/", "/advert/",
    "/advertising/", "/adserver/", "popunder", "pop-under", "onclick="
  };

  public MovieBoxWebViewClient(Bridge bridge) {
    super(bridge);
  }

  public static void setPlayerMode(boolean enabled) {
    playerMode = enabled;
  }

  private boolean hostMatches(String host) {
    if (host == null) return false;
    String lower = host.toLowerCase(Locale.US);
    for (String domain : BLOCKED_DOMAINS) {
      if (lower.equals(domain) || lower.endsWith("." + domain)) return true;
    }
    for (String part : BLOCKED_HOST_PARTS) {
      if (lower.contains(part)) return true;
    }
    return false;
  }

  private boolean shouldBlock(Uri uri) {
    if (!playerMode || uri == null) return false;
    String scheme = uri.getScheme();
    if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) return false;
    if (hostMatches(uri.getHost())) return true;
    String text = uri.toString().toLowerCase(Locale.US);
    for (String part : BLOCKED_URL_PARTS) {
      if (text.contains(part)) return true;
    }
    return false;
  }

  private WebResourceResponse emptyResponse() {
    return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
  }

  @Override
  public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
    WebResourceResponse local = super.shouldInterceptRequest(view, request);
    if (local != null) return local;
    if (request != null && shouldBlock(request.getUrl())) return emptyResponse();
    return null;
  }

  @Override
  public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    if (playerMode && request != null && request.isForMainFrame()) {
      Uri uri = request.getUrl();
      if (uri != null && ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
        String host = uri.getHost();
        if (host != null && !host.equalsIgnoreCase("localhost")) return true;
      }
    }
    return super.shouldOverrideUrlLoading(view, request);
  }
}
`;
fs.writeFileSync(path.join(pkgDir, 'MovieBoxWebViewClient.java'), webClient)

const main = `package com.moviebox.personal;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private boolean movieBoxImmersive = false;
  private boolean movieBoxPlayerMode = false;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Plugins locais do Capacitor devem ser registrados antes de super.onCreate().
    registerPlugin(MovieNativePlugin.class);
    super.onCreate(savedInstanceState);

    if (bridge != null && bridge.getWebView() != null) {
      bridge.setWebViewClient(new MovieBoxWebViewClient(bridge));
      WebSettings settings = bridge.getWebView().getSettings();
      settings.setJavaScriptCanOpenWindowsAutomatically(false);
      settings.setSupportMultipleWindows(false);
    }
  }

  public void setMovieBoxPlayerMode(boolean enabled) {
    movieBoxPlayerMode = enabled;
    MovieBoxWebViewClient.setPlayerMode(enabled);
    if (enabled) setMovieBoxImmersive(true);
  }

  public void setMovieBoxImmersive(boolean enabled) {
    movieBoxImmersive = enabled;
    applyMovieBoxImmersive();
  }

  private void applyMovieBoxImmersive() {
    Window window = getWindow();
    if (window == null) return;

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.setDecorFitsSystemWindows(!movieBoxImmersive);
      WindowInsetsController controller = window.getInsetsController();
      if (controller != null) {
        if (movieBoxImmersive) {
          controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
          controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        } else {
          controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
        }
      }
    } else {
      if (movieBoxImmersive) {
        window.getDecorView().setSystemUiVisibility(
          View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
          View.SYSTEM_UI_FLAG_FULLSCREEN |
          View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
          View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
          View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
          View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
      } else {
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
      }
    }
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus && movieBoxImmersive) applyMovieBoxImmersive();
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (movieBoxPlayerMode || movieBoxImmersive) applyMovieBoxImmersive();
  }
}
`;
fs.writeFileSync(path.join(pkgDir, 'MainActivity.java'), main)

console.log('Media Box v1.6.1: bridge nativa corrigida, downloader cancelável, modo imersivo e filtro nativo de anúncios instalados.')
