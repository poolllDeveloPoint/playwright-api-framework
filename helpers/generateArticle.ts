import { faker } from '@faker-js/faker'

export function getNewArticle() {
    return {
        "article": {
            "title": faker.lorem.sentence(5),
            "description": faker.lorem.sentence(3),
            "body": faker.lorem.paragraph(),
            "tagList": []
        }
    }
}