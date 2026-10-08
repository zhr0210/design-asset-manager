export const validOfficialModelCatalogReleaseInput = {
  schemaVersion: 1,
  pinnedTrustRoot: {
    catalogId: 'official-model-catalog',
    keyId: 'test-root-2026',
    publicKeySpkiBase64:
      'MCowBQYDK2VwAyEAAa0KDW723N95GQk91vidcoQqGgQw0uMz7VrcXFubrK0='
  },
  bundledCatalog: {
    envelope: {
      catalogId: 'official-model-catalog',
      keyId: 'test-root-2026',
      payload: {
        schemaVersion: 1,
        catalogId: 'official-model-catalog',
        keyId: 'test-root-2026',
        sequence: '42',
        trustVerifiedAt: '2026-08-12T00:00:00.000Z',
        artifacts: [{
          manifestId: 'qwen3-vl-4b-q4-k-m@2026-08',
          familyId: 'qwen3-vl',
          checkpointId: 'qwen3-vl-4b-instruct',
          variantId: 'qwen3-vl-4b-instruct-q4-k-m',
          displayName: 'Qwen3-VL 4B Q4_K_M',
          immutableRevision:
            'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          files: [{
            path: 'tokenizer/tokenizer.json',
            role: 'tokenizer',
            format: 'json',
            sizeBytes: 200,
            sha256:
              '3333333333333333333333333333333333333333333333333333333333333333'
          }, {
            path: 'weights/model.gguf',
            role: 'weights',
            format: 'gguf',
            sizeBytes: 1_000,
            sha256:
              '2222222222222222222222222222222222222222222222222222222222222222'
          }],
          requiredAcknowledgements: [{
            id: 'license:qwen3-vl-4b:2026-08',
            kind: 'license',
            label: 'Qwen model license'
          }]
        }]
      },
      signatureBase64:
        'FzC6cDw2vQnwCI57JMirmQUR1b8+qV+DvbFYebmDt6TJp10DH7ERYO8B85PRiKg8SsPDWYQFjOQoWm1tLDa7BA=='
    },
    releasePin: {
      catalogId: 'official-model-catalog',
      keyId: 'test-root-2026',
      sequence: '42',
      binding:
        'admission:967521dcd48e8359822bae9dc0a951fc7a63df11e828b4754dbe908d9e8e81b2'
    }
  }
} as const
