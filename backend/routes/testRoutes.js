// Add this temporary test route at the very top of uploadRoutes.js
router.get('/test', (req, res) => {
    res.json({ message: 'Upload routes are working!' });
});