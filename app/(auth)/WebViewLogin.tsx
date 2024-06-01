import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth-supabase";
import { isLoaded } from "expo-font";



const WebViewLogin = () => {
  const { azure, getAccessToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const webviewRef = useRef<WebView>(null);
  azure().then((response) => {
    // console.log('response', response);
    if (response.error) {
      setError(response.error);
    }
    if (response.data && response.data.url) {
      setUrl(response.data.url);
    }
  });

  useEffect(() => {
    if (url) {
 
      setLoading(false);
    }
  }, [url, error]);

  if (loading) {
    return (
      <SafeAreaView>
        <Text> Loading... </Text>
      </SafeAreaView>
    );
  }

  if (url) {
    return (
      <WebView
        ref={webviewRef}
        style={{ paddingTop: 20, marginTop: 60 }}
        source={{ uri: url }}
        onNavigationStateChange={(newNavState) => {
          if (newNavState.url.includes("refresh_token")) {
            webviewRef.current?.stopLoading();
            const queryParams = new URLSearchParams(
              newNavState.url.split("#")[1]
            );

            const refreshToken = queryParams.get("refresh_token");

            console.log("URL", refreshToken);
            if (refreshToken) {
              getAccessToken(refreshToken);
            }
          }
        }}
      />
    );
  }

  if (error) {
    return (
      <SafeAreaView>
        <Text> Error: {error.message} </Text>
      </SafeAreaView>
    );
  }
};

export default WebViewLogin;

const styles = StyleSheet.create({});
