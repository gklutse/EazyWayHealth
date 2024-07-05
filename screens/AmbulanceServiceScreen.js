// screens/AmbulanceServiceScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';

export default function AmbulanceServiceScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);

  useEffect(() => {
    getLocationPermission();
  }, []);

  const getLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required to request an ambulance.');
      return;
    }
    getCurrentLocation();
  };

  const getCurrentLocation = async () => {
    let { coords } = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  };

  const handleRequest = async () => {
    if (location) {
      try {
        const response = await axios.post('http://192.168.112.139:5000/request-ambulance', {
          latitude: location.latitude,
          longitude: location.longitude,
        });
        setAmbulanceLocation(response.data.ambulanceLocation);
        Alert.alert('Success', 'Ambulance requested successfully!');
      } catch (error) {
        Alert.alert('Error', 'Failed to request ambulance');
      }
    }
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView style={styles.map} initialRegion={location}>
          <Marker coordinate={location} title="Your Location" />
          {ambulanceLocation && (
            <Marker coordinate={ambulanceLocation} title="Nearest Ambulance" pinColor="red" />
          )}
        </MapView>
      ) : (
        <Text>Fetching location...</Text>
      )}
      <Button title="Request Ambulance" onPress={handleRequest} />
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '80%',
  },
});
