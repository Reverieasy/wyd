package com.watchudoin.widgettest;

import android.app.Activity;
import android.app.Instrumentation;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetHostView;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import java.io.File;
import java.io.FileOutputStream;

/** Real AppWidgetHost check; runs in an isolated emulator without an account. */
public class WidgetSmokeInstrumentation extends Instrumentation {
    private AppWidgetHost host;
    private AppWidgetHostView widget;
    private int widgetId;
    private volatile boolean drawn;

    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }

    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            Context context = getTargetContext();
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            AppWidgetProviderInfo provider = null;
            for (AppWidgetProviderInfo candidate : manager.getInstalledProviders()) {
                if (candidate.provider.getClassName().equals("com.watchudoin.app.widget.WydMedium")) provider = candidate;
            }
            if (provider == null) throw new Exception("Widget provider missing from installed APK");
            final AppWidgetProviderInfo info = provider;
            runOnMainSync(() -> {
                host = new AppWidgetHost(context, 76438);
                host.deleteHost();
                widgetId = host.allocateAppWidgetId();
                Bundle options = new Bundle();
                options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 320);
                options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 320);
                options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 160);
                options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 160);
                if (!manager.bindAppWidgetIdIfAllowed(widgetId, info.provider, options)) throw new IllegalStateException("Grant widget binding to com.watchudoin.app before running this check");
                widget = host.createView(context, widgetId, info);
                host.startListening();
                widget.updateAppWidgetSize(options, 320, 160, 320, 160);
            });
            long deadline = SystemClock.elapsedRealtime() + 45000;
            while (!drawn && SystemClock.elapsedRealtime() < deadline) {
                runOnMainSync(() -> { drawn = hasBitmap(widget); });
                if (!drawn) SystemClock.sleep(500);
            }
            if (!drawn) throw new Exception("Widget remained empty: no rendered image received by AppWidgetHost within 45 seconds");
            runOnMainSync(() -> {
                int width = Math.round(320 * context.getResources().getDisplayMetrics().density);
                int height = Math.round(160 * context.getResources().getDisplayMetrics().density);
                widget.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY));
                widget.layout(0, 0, width, height);
                Bitmap screenshot = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                widget.draw(new Canvas(screenshot));
                try (FileOutputStream output = new FileOutputStream(new File(context.getExternalFilesDir(null), "widget-smoke.png"))) {
                    screenshot.compress(Bitmap.CompressFormat.PNG, 100, output);
                } catch (Exception error) { throw new RuntimeException(error); }
            });
            result.putString("result", "PASS: actual Android AppWidgetHost received a rendered widget bitmap");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            result.putString("failure", error.toString());
            finish(Activity.RESULT_CANCELED, result);
        } finally {
            if (host != null) runOnMainSync(() -> { host.stopListening(); host.deleteHost(); });
        }
    }

    private boolean hasBitmap(View view) {
        if (view instanceof ImageView && ((ImageView)view).getDrawable() != null) return true;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup)view;
            for (int i = 0; i < group.getChildCount(); i++) if (hasBitmap(group.getChildAt(i))) return true;
        }
        return false;
    }
}
