import { describe, expect, test } from 'bun:test'
import { createImageDeliveryCatalog, createImageDeliveryManifest } from 'ts-images/delivery'

describe('the delivery entry point', () => {
  test('exports the manifest and catalog builders', () => {
    expect(createImageDeliveryManifest).toBeFunction()
    expect(createImageDeliveryCatalog).toBeFunction()
  })
})
