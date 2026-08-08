import fs from 'fs/promises'
import path from 'path'

const SCHEMA_BASE_PATH = './response-schemas'

export async function validateSchema (dirName: string, fileName: string) {
    const schemaPath = path.join(SCHEMA_BASE_PATH, dirName, `${fileName}_schema.json`)
    const schema = await loadSchema(schemaPath)
    console.log({schema})
}

async function loadSchema(schemaPath: string) {
    try {
        const schemaContent = await fs.readFile(schemaPath, 'utf-8')
        return JSON.parse(schemaContent)
    } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to read schema file: ${error_message}`)
    }
}