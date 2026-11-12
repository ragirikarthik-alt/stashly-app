import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

const logo = require('../assets/logo-mark.png');

/**
 * Last-resort safety net. Savings are stored in SQLite and are not affected by a
 * rendering error, so the user can simply try again.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (__DEV__) {
      console.error('Stashly crashed', error, info?.componentStack);
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <View style={styles.root}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Your savings are safe on this device. Tap below to reopen Stashly where you left off.
        </Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F2A21', alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { width: 72, height: 90, marginBottom: 20 },
  title: { color: '#F3F7F3', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { color: '#9FC3B2', fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 320 },
  button: { marginTop: 24, backgroundColor: '#6EE7B0', borderRadius: 999, paddingHorizontal: 28, height: 50, justifyContent: 'center' },
  buttonText: { color: '#08261B', fontSize: 16, fontWeight: '700' },
});
