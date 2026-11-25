import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Fingerprint, Globe, LockKeyhole, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const SignIn1 = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const { height } = useWindowDimensions();
  const [hasHydrated, setHasHydrated] = useState(false);
  const { accessToken, isLoading: isCheckingSession } = useAuth();

  useEffect(() => {
    // Keep the first client render identical to the server render, then apply
    // the viewport-dependent compact layout after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!isCheckingSession && accessToken) {
      router.replace('/dashboard');
    }
  }, [accessToken, isCheckingSession]);

  const compact = hasHydrated && height < 720;

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSignIn = async () => {
    if (isSubmitting) {
      return;
    }
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.session?.access_token) {
        setError('Unable to obtain a session token. Please try again.');
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession || accessToken) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.06)', 'rgba(18, 18, 18, 0.92)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.card, compact && styles.cardCompact]}>
            <View style={[styles.logoContainer, compact && styles.logoContainerCompact]}>
              <Fingerprint size={26} color="#ffffff" strokeWidth={1.8} />
            </View>

            <Text style={[styles.title, compact && styles.titleCompact]}>HextaUI</Text>

            <View style={styles.form}>
              <View style={styles.fields}>
                <View
                  style={[styles.inputContainer, focusedField === 'email' && styles.inputFocused]}>
                  <Mail size={18} color="rgba(255, 255, 255, 0.5)" strokeWidth={1.8} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="rgba(209, 213, 219, 0.75)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!isSubmitting}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                    accessibilityLabel="Email"
                  />
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'password' && styles.inputFocused,
                  ]}>
                  <LockKeyhole size={18} color="rgba(255, 255, 255, 0.5)" strokeWidth={1.8} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="rgba(209, 213, 219, 0.75)"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    editable={!isSubmitting}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    accessibilityLabel="Password"
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <View style={styles.divider} />

              <View style={styles.actions}>
                <Pressable
                  onPress={handleSignIn}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || isSubmitting) && styles.pressed,
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
                  <LinearGradient
                    colors={['#232526', '#2d2e30']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.googleGradient}>
                    <Globe size={20} color="#ffffff" strokeWidth={1.8} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </LinearGradient>
                </Pressable>

                <View style={styles.signUpRow}>
                  <Text style={styles.signUpText}>
                    Don&apos;t have an account?{' '}
                    <Text
                      accessibilityRole="button"
                      onPress={() => router.push('/signup')}
                      style={styles.signUpLink}>
                      Sign up, it&apos;s free!
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.socialProof, compact && styles.socialProofCompact]}>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.65,
    shadowRadius: 48,
    elevation: 24,
  },
  cardCompact: {
    padding: 24,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoContainerCompact: {
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  titleCompact: {
    marginBottom: 16,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  fields: {
    width: '100%',
    gap: 12,
  },
  inputContainer: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  inputFocused: {
    borderColor: 'rgba(156, 163, 175, 0.9)',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 0,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'left',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  googleGradient: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.75,
  },
  signUpRow: {
    width: '100%',
    alignItems: 'center',
  },
  signUpText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
  signUpLink: {
    color: 'rgba(255, 255, 255, 0.85)',
    textDecorationLine: 'underline',
  },
  socialProof: {
    width: '100%',
    maxWidth: 384,
    marginTop: 48,
    alignItems: 'center',
  },
  socialProofCompact: {
    marginTop: 24,
  },
  socialText: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  socialHighlight: {
    color: '#ffffff',
    fontWeight: '500',
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#181824',
    marginHorizontal: -2,
    backgroundColor: '#2d2e30',
  },
});

export { SignIn1 };
export default SignIn1;
