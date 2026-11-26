// Public configuration. Never put service-role keys or bank credentials here.
window.NAMCUMZ_CONFIG = {
    environment: 'production',
    supabaseUrl: 'https://vqnuutdmcekqkbdvawlw.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbnV1dGRtY2VrcWtiZHZhd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTgwNjIsImV4cCI6MjEwMDM3NDA2Mn0.T8_AdJOWEmf68oVrOjv8G51IScykzqhBnfHIi5LK-G4',
    expectedDbVersion: 'production_002_credentials_encryption',
    supportedDbVersions: ['production_002_credentials_encryption', 'production_009_launch_access', 'production_010_credential_lifecycle'],
    turnstileSiteKey: '',
    bank: {
        bankBin: '970403',
        bankCode: 'Sacombank',
        bankName: 'Sacombank (VietQR Napas 247)',
        accountNumber: '79202012546',
        displayAccountNumber: '79202012546',
        accountName: 'NGUYEN HOANG NAM',
        qrImageUrl: '',
        expireMinutes: 15
    }
};
