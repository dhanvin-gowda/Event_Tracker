import { Link, router, usePathname } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';

const MAX_CONTENT_WIDTH = 800;
const SIGN_IN_ROUTE = '/';
const SIGN_UP_ROUTE = '/signup';
const DASHBOARD_ROUTE = '/dashboard';

export function TopNavbar() {
  const pathname = usePathname();
  const { user, accessToken, isLoading, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signInActive = pathname === SIGN_IN_ROUTE;
  const signUpActive = pathname === SIGN_UP_ROUTE;
  const isAuthenticated = Boolean(accessToken);
  const homeRoute = isAuthenticated ? DASHBOARD_ROUTE : SIGN_IN_ROUTE;

  const userLabel =
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    user?.email ||
    null;

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await signOut();
      router.replace(SIGN_IN_ROUTE);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.inner}>
        <Link href={homeRoute} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="HextaUI home"
            style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
            <Text style={styles.brandText}>HextaUI</Text>
          </Pressable>
        </Link>

        {isLoading ? (
          <View style={styles.actions} />
        ) : isAuthenticated ? (
          <View style={styles.actions}>
            {userLabel ? (
              <Text numberOfLines={1} style={styles.userLabel}>
                {userLabel}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSignOut}
              disabled={isSigningOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={({ pressed }) => [
                styles.navButton,
                styles.signOutButton,
                (pressed || isSigningOut) && styles.pressed,
              ]}>
              <LogOut size={14} color="rgba(255, 255, 255, 0.85)" strokeWidth={1.8} />
              <Text style={styles.navButtonTextActive}>
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            <Link href={SIGN_UP_ROUTE} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign up"
                accessibilityState={{ selected: signUpActive }}
                style={({ pressed }) => [
                  styles.navButton,
                  signUpActive && styles.navButtonActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.navButtonText, signUpActive && styles.navButtonTextActive]}>
                  Sign up
                </Text>
              </Pressable>
            </Link>

            <Link href={SIGN_IN_ROUTE} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                accessibilityState={{ selected: signInActive }}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#121212',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 20,
    gap: 12,
  },
  brand: {
    paddingVertical: 8,
    borderRadius: 8,
  },
  brandText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  userLabel: {
    color: '#9ca3af',
    fontSize: 13,
    maxWidth: 160,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  navButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navButtonText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 14,
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: '#ffffff',
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  primaryButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
