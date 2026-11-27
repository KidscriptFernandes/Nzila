import { useEffect } from "react";
import { Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";

export default function AuthCallbackScreen() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return <Redirect href="/" />;
}

