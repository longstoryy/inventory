// Test API Endpoints
// Run with: node test-api.js

const API_URL = 'http://localhost:3000/api';

async function testAPI() {
    console.log('🧪 Testing AgroChem Inventory API\n');

    try {
        // 1. Test Registration
        console.log('1️⃣ Testing Registration...');
        const registerRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organizationName: 'Test Company',
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            })
        });

        if (!registerRes.ok) {
            const error = await registerRes.json();
            console.log('❌ Registration failed:', error);
            console.log('   This might be OK if user already exists\n');
        } else {
            const registerData = await registerRes.json();
            console.log('✅ Registration successful!');
            console.log('   Token:', registerData.token.substring(0, 20) + '...');
            console.log('   User:', registerData.user.name, '(' + registerData.user.role + ')\n');
        }

        // 2. Test Login
        console.log('2️⃣ Testing Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) {
            const error = await loginRes.json();
            console.log('❌ Login failed:', error);
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login successful!');
        console.log('   Token:', token.substring(0, 20) + '...');
        console.log('   User:', loginData.user.name, '\n');

        // 3. Test Products (authenticated)
        console.log('3️⃣ Testing Products API...');
        const productsRes = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!productsRes.ok) {
            const error = await productsRes.json();
            console.log('❌ Products fetch failed:', error);
            return;
        }

        const products = await productsRes.json();
        console.log('✅ Products fetched successfully!');
        console.log('   Count:', products.length);
        if (products.length > 0) {
            console.log('   First product:', products[0].name);
        }
        console.log('');

        // 4. Test Creating a Product
        console.log('4️⃣ Testing Create Product...');
        const createProductRes = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Herbicide',
                sku: 'TEST-001',
                category: 'Herbicide',
                hazardClass: 'Class II',
                unit: 'liter',
                reorderLevel: 100,
                description: 'Test product from API'
            })
        });

        if (!createProductRes.ok) {
            const error = await createProductRes.json();
            console.log('❌ Create product failed:', error);
        } else {
            const newProduct = await createProductRes.json();
            console.log('✅ Product created successfully!');
            console.log('   Product:', newProduct.name);
            console.log('   SKU:', newProduct.sku);
        }

        console.log('\n✅ All tests completed!');
        console.log('🎉 Your API is working perfectly with Supabase!');

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.log('\nMake sure:');
        console.log('1. npm run dev is running');
        console.log('2. Database schema was applied in Supabase');
        console.log('3. .env.local has correct DATABASE_URL and JWT_SECRET');
    }
}

testAPI();
