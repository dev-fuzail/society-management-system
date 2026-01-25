import { useRouter } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function Sidebar() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sidebar</Text>
      <Button title="Close" onPress={() => router.back()} />

      {/* Example links */}
      <Button title="Profile" onPress={() => router.push('/(tabs)/profile')} />
      {/* <Button title="Explore" onPress={() => router.push('/(tabs)/explore')} /> */}
      <Button title="Logout" onPress={() => alert('Logging out')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
