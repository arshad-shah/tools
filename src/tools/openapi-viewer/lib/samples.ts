/** A small OpenAPI 3.0 document: the example and the tests' fixture. */
export const SAMPLE_OPENAPI = `openapi: 3.0.3
info:
  title: Pet Store
  version: 1.2.0
  description: A sample API with pets, owners and a tree of categories.
servers:
  - url: https://{region}.api.example.com/v1
    description: Production
    variables:
      region:
        default: eu
        enum: [eu, us]
  - url: /v1
    description: Same origin
tags:
  - name: pets
    description: Everything about pets
  - name: owners
security:
  - apiKey: []
paths:
  /pets:
    get:
      tags: [pets]
      summary: List pets
      operationId: listPets
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: status
          in: query
          required: true
          schema: { type: string, enum: [available, sold] }
        - $ref: '#/components/parameters/TraceId'
      responses:
        '200':
          description: A page of pets
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Pet' }
    post:
      tags: [pets]
      summary: Add a pet
      operationId: addPet
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Pet' }
      responses:
        '201': { $ref: '#/components/responses/Created' }
  /pets/{petId}:
    parameters:
      - name: petId
        in: path
        required: true
        schema: { type: string, format: uuid }
    get:
      tags: [pets]
      summary: Get a pet
      operationId: getPet
      responses:
        '200':
          description: The pet
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Pet' }
              example: { id: 7, name: Rex }
        '404': { description: Not found }
    delete:
      tags: [pets]
      summary: Delete a pet
      deprecated: true
      security:
        - basicAuth: []
      responses:
        '204': { description: Deleted }
  /owners/{ownerId}/avatar:
    put:
      tags: [owners]
      summary: Upload an owner's avatar
      parameters:
        - name: ownerId
          in: path
          required: true
          schema: { type: integer, example: 42 }
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                caption: { type: string }
                file: { type: string, format: binary }
      responses:
        '200': { description: Saved }
  /health:
    get:
      summary: Health check
      security: []
      responses:
        '200':
          description: OK
          content:
            text/plain:
              schema: { type: string, example: ok }
components:
  parameters:
    TraceId:
      name: X-Trace-Id
      in: header
      required: true
      schema: { type: string }
  responses:
    Created:
      description: Created
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Pet' }
  securitySchemes:
    apiKey: { type: apiKey, in: header, name: X-API-Key }
    basicAuth: { type: http, scheme: basic }
  schemas:
    Pet:
      type: object
      required: [name]
      properties:
        id: { type: integer, format: int64, readOnly: true }
        name: { type: string, example: Rex }
        tags:
          type: array
          items: { type: string }
        category: { $ref: '#/components/schemas/Category' }
        owner:
          allOf:
            - $ref: '#/components/schemas/Owner'
    Category:
      type: object
      properties:
        name: { type: string }
        parent: { $ref: '#/components/schemas/Category' }
        children:
          type: array
          items: { $ref: '#/components/schemas/Category' }
    Owner:
      type: object
      properties:
        email: { type: string, format: email }
`;
