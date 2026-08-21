import fs from 'fs/promises'
import path from 'path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { createSchema } from 'genson-js';

const ajv = new Ajv({allErrors: true})
addFormats(ajv)

const SCHEMA_BASE_PATH = './response-schemas'

export async function validateSchema (dirName: string, fileName: string, responseBody: object) {
    const schemaPath = path.join(SCHEMA_BASE_PATH, dirName, `${fileName}_schema.json`)
    const isSchemaExist = await checkIsSchemaExist(schemaPath)
    const shouldGenerateSchema = !isSchemaExist

    if (shouldGenerateSchema) await generateNewSchema(schemaPath, responseBody)

    const schema = await loadSchema(schemaPath)
    const validate = ajv.compile(schema)
    const valid = validate(responseBody)
    const isSchemaInvalid = !valid
    if (isSchemaInvalid) {
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
        const newSchema = addFormatsToSchema(createSchema(responseBody), responseBody)
        await fs.mkdir(path.dirname(schemaPath), {recursive: true})
        await fs.writeFile(schemaPath, JSON.stringify(newSchema))
    } catch (error) {
        throw new Error (`Failed to generate new schema with error: ${error}`)
    }
}

function addFormatsToSchema(schema: any, responseBody: any): any {
    const isObjectSchema = schema.type === 'object'
    const hasSchemaProperties = Boolean(schema.properties)
    const isObjectResponse = responseBody !== null && typeof responseBody === 'object'
    const shouldProcessObjectSchema = isObjectSchema && hasSchemaProperties && isObjectResponse

    if (shouldProcessObjectSchema) {
        for (const propertyName of Object.keys(schema.properties)) {
            schema.properties[propertyName] = addFormatsToSchema(
                schema.properties[propertyName],
                responseBody[propertyName]
            )
        }
    }

    const isArraySchema = schema.type === 'array'
    const hasSchemaItems = Boolean(schema.items)
    const isArrayResponse = Array.isArray(responseBody)
    const shouldProcessArraySchema = isArraySchema && hasSchemaItems && isArrayResponse

    if (shouldProcessArraySchema) {
        schema.items = addFormatsToSchema(schema.items, responseBody[0])
    }

    const isStringSchema = schema.type === 'string'
    const isStringResponse = typeof responseBody === 'string'
    const shouldProcessStringSchema = isStringSchema && isStringResponse

    if (shouldProcessStringSchema) {
        const format = getStringFormat(responseBody)
        const isFormatDefined = Boolean(format)

        if (isFormatDefined) schema.format = format
    }

    return schema
}

function getStringFormat(value: string): string | undefined {
    const isDateValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    const isTimeValue = /^\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
    const isDateTimeValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
    const isEmailValue = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    const isUuidValue = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    const isUriValue = /^https?:\/\/[^\s]+$/.test(value)

    if (isDateValue) return 'date'
    if (isTimeValue) return 'time'
    if (isDateTimeValue) return 'date-time'
    if (isEmailValue) return 'email'
    if (isUuidValue) return 'uuid'
    if (isUriValue) return 'uri'

    return undefined
}