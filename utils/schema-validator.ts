import fs from 'fs/promises'
import path from 'path'
import Ajv from 'ajv'
import { createSchema } from 'genson-js';

const ajv = new Ajv({allErrors: true})

const SCHEMA_BASE_PATH = './response-schemas'

export async function validateSchema (dirName: string, fileName: string, responseBody: object) {
    const schemaPath = path.join(SCHEMA_BASE_PATH, dirName, `${fileName}_schema.json`)
    const isSchemaExist = await checkIsSchemaExist(schemaPath)

    if (!isSchemaExist) await generateNewSchema(schemaPath, responseBody)

    const schema = await loadSchema(schemaPath)
    const validate = ajv.compile(schema)
    const valid = validate(responseBody)
    if (!valid) {
        throw new Error(
            `Schema validation for ${fileName}_schema.json failed with error:\n`+
            `${JSON.stringify(validate.errors, null, 4)}\n\n` +
            `with actual response:\n` +
            `${JSON.stringify(responseBody, null, 4)}`
        )
    }
}

async function checkIsSchemaExist(schemaPath: string) {
    try {
        await fs.access(schemaPath)
        return true
    } catch (error) {
        return false
    }
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

async function generateNewSchema(schemaPath: string, responseBody: object) {
    try {
        const newSchema = createSchema(responseBody);
        await fs.mkdir(path.dirname(schemaPath), {recursive: true})
        await fs.writeFile(schemaPath, JSON.stringify(newSchema))
    } catch (error) {
        throw new Error (`Failed to generate new schema with error: ${error}`)
    }
}