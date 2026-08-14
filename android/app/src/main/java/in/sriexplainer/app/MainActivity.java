package in.sriexplainer.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebSettings settings = this.bridge.getWebView().getSettings();
                String ua = settings.getUserAgentString();
                if (ua != null && ua.contains("Version/4.0")) {
                    settings.setUserAgentString(ua.replace("Version/4.0 ", "").replace("Version/4.0", ""));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
