import { useEffect } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import * as Linking from "expo-linking";

// Polyfill fetch to prevent Supabase from trying to import @supabase/node-fetch
// This is a no-op in React Native where fetch already exists
if (typeof globalThis.fetch === 'undefined') {
  // @ts-ignore
  globalThis.fetch = fetch;
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle deep link that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('Deep link received:', url);

    try {
      // Parse the URL
      const parsed = Linking.parse(url);
      console.log('Parsed deep link:', parsed);

      // Handle join links
      if (parsed.path === 'join' || parsed.hostname === 'join') {
        const code = parsed.queryParams?.code as string | undefined;
        
        if (code) {
          // Navigate to join screen with code
          router.push(`/join?code=${code}`);
        } else {
          // Navigate to join screen without code (manual entry)
          router.push('/join');
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="join" />
      <Stack.Screen name="join-session" />
      <Stack.Screen name="qr-scanner" />
      <Stack.Screen name="consent" />
      <Stack.Screen name="create-session" />
      <Stack.Screen name="session-waiting" />
      <Stack.Screen name="session-admin" />
      <Stack.Screen name="session-live" />
      <Stack.Screen name="session-summary" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
