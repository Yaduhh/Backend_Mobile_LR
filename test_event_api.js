const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

// Test function untuk login dan mendapatkan token
async function login() {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@mki.com',
        password: 'admin123'
      })
    });

    const data = await response.json();
    console.log('Login response:', data);
    
    if (data.success) {
      return data.data.token;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Test function untuk mengambil events
async function testGetEvents(token) {
  try {
    const response = await fetch(`${BASE_URL}/events`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Get events response:', data);
    
    if (data.success && data.data.length > 0) {
      return data.data[0].id; // Return first event ID
    } else {
      console.log('No events found');
      return null;
    }
  } catch (error) {
    console.error('Get events error:', error);
    return null;
  }
}

// Test function untuk mengambil detail event
async function testGetEventDetail(token, eventId) {
  try {
    const response = await fetch(`${BASE_URL}/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Get event detail response:', data);
    
    return data;
  } catch (error) {
    console.error('Get event detail error:', error);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('Starting API tests...\n');
  
  // Test login
  console.log('1. Testing login...');
  const token = await login();
  if (!token) {
    console.log('Login failed, stopping tests');
    return;
  }
  console.log('Login successful\n');
  
  // Test get events
  console.log('2. Testing get events...');
  const eventId = await testGetEvents(token);
  if (!eventId) {
    console.log('No events found, stopping tests');
    return;
  }
  console.log(`Found event with ID: ${eventId}\n`);
  
  // Test get event detail
  console.log('3. Testing get event detail...');
  const eventDetail = await testGetEventDetail(token, eventId);
  if (eventDetail) {
    console.log('Event detail test completed');
  } else {
    console.log('Event detail test failed');
  }
}

// Run tests
runTests().catch(console.error); 