package com.ethiocosmos.learning;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DownloadsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
