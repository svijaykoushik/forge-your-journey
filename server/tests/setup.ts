// server/tests/setup.ts
jest.mock('@google/genai', () => {
  const originalModule = jest.requireActual('@google/genai');
  return {
    ...originalModule,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        // Corrected mock structure based on GenerateContentResponse type
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => 'mocked AI response text',
            // candidates: [], // Add other properties if needed by tests
            // promptFeedback: {}, // Add other properties if needed by tests
          }
        }),
        generateImages: jest.fn().mockResolvedValue({
          // Assuming GenerateImagesResponse structure is an array of generated images
          // and each image object has an 'image.imageBytes' property.
          // This mock needs to align with how your code actually processes this response.
          // Based on server/utils.ts, it's result.generatedImages[0].image.imageBytes
          generatedImages: [{ image: { imageBytes: 'mockedBase64ImageBytes' } }],
        }),
      },
    })),
  };
});
