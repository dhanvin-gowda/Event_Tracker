import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { Fingerprint, LockKeyhole, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

type Field = 'name' | 'email' | 'password' | 'confirmPassword';

type FormValues = Record<Field, string>;

const INITIAL_VALUES: FormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const SignUp = () => {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [focusedField, setFocusedField] = useState<Field | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleSignUp = async () => {
    if (isSubmitting) {
      return;
    }

    if (!values.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!validateEmail(values.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (values.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: { full_name: values.name.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.replace('/dashboard');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            style={styles.card}>
              <View style={styles.logoContainer}>
                <Fingerprint size={26} color="#ffffff" strokeWidth={1.8} />
              </View>

              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Join HextaUI in a few seconds.</Text>

              <View style={styles.form}>
                <View style={styles.fields}>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'name' && styles.inputFocused,
                    ]}>
                    <User size={18} color="rgba(255, 255, 255, 0.5)" strokeWidth={1.8} />
                    <TextInput
                      style={styles.input}
                      placeholder="Full name"
                      placeholderTextColor="rgba(209, 213, 219, 0.75)"
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="name"
                      textContentType="name"
                      editable={!isSubmitting}
                      value={values.name}
                      onChangeText={(value) => setFieldValue('name', value)}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="next"
                      accessibilityLabel="Full name"
                    />
                  </View>

                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'email' && styles.inputFocused,
                    ]}>
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
                      value={values.email}
                      onChangeText={(value) => setFieldValue('email', value)}
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
                      autoComplete="new-password"
                      textContentType="newPassword"
                      editable={!isSubmitting}
                      value={values.password}
                      onChangeText={(value) => setFieldValue('password', value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="next"
                      accessibilityLabel="Password"
                    />
                  </View>

                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'confirmPassword' && styles.inputFocused,
                    ]}>
                    <LockKeyhole size={18} color="rgba(255, 255, 255, 0.5)" strokeWidth={1.8} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor="rgba(209, 213, 219, 0.75)"
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                      textContentType="newPassword"
                      editable={!isSubmitting}
                      value={values.confirmPassword}
                      onChangeText={(value) => setFieldValue('confirmPassword', value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="done"
                      onSubmitEditing={handleSignUp}
                      accessibilityLabel="Confirm password"
                    />
                  </View>

                  {error ? (
                    <Text accessibilityRole="alert" style={styles.errorText}>
                      {error}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.divider} />

                <View style={styles.actions}>
                  <Pressable
                    onPress={handleSignUp}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Create account"
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (pressed || isSubmitting) && styles.pressed,
                    ]}>
                    <Text style={styles.primaryButtonText}>
                      {isSubmitting ? 'Creating account…' : 'Create account'}
                    </Text>
                  </Pressable>

                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>
                      Already have an account?{' '}
                      <Link href="/" asChild>
                        <Text accessibilityRole="button" style={styles.footerLink}>
                          Sign in
                        </Text>
                      </Link>
                    </Text>
                  </View>
                </View>
              </View>
          </LinearGradient>
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
    backgroundColor: 'rgba(18, 18, 18, 0.92)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.65,
    shadowRadius: 48,
    elevation: 24,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
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
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  footerRow: {
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
  footerLink: {
    color: 'rgba(255, 255, 255, 0.85)',
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.75,
  },
});

export { SignUp };
export default SignUp;
