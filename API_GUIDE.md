# Guia da API para Desenvolvedores Frontend

Este documento descreve como interagir com a API do backend, cobrindo autenticação e os principais endpoints disponíveis.

## URL Base

A URL base para todas as requisições da API é:

```
http://127.0.0.1:5000
```

---

## Autenticação

A API usa autenticação baseada em Token (JWT - JSON Web Token). Para acessar endpoints protegidos, você precisa incluir um token no cabeçalho `Authorization` de suas requisições.

### Fluxo de Autenticação

1.  **Registrar o Admin do Escritório**: O primeiro passo para um novo escritório é registrar seu usuário principal (Admin).
2.  **Fazer Login**: O usuário (Admin ou funcionário) faz login com suas credenciais (`login` e `senha`).
3.  **Receber o Token**: Se o login for bem-sucedido, a API retornará um token JWT.
4.  **Armazenar o Token**: O frontend deve armazenar este token de forma segura (por exemplo, em `localStorage` ou `sessionStorage`).
5.  **Enviar o Token**: Para cada requisição a um endpoint protegido, inclua o token no cabeçalho `Authorization` no seguinte formato:

    ```
    Authorization: Bearer <seu_token_jwt>
    ```

---

## Endpoints da API

A seguir estão os detalhes de cada endpoint disponível.

### 1. Registro de Novo Escritório (Admin)

Este endpoint é usado para registrar um novo escritório, criando o primeiro usuário com a role `Admin`.

-   **Endpoint**: `POST /register`
-   **Autenticação**: Nenhuma
-   **Descrição**: Cria um novo usuário Admin.

**Corpo da Requisição (Request Body):**

```json
{
    "nome": "Nome do Admin",
    "email": "admin@escritorio.com",
    "login": "admin_login",
    "senha": "uma_senha_forte",
    "cnpj": "12345678901234",
    "razao_social": "Escritório de Advocacia Exemplo LTDA",
    "nome_fantasia": "Advocacia Exemplo",
    "endereco_rua": "Rua das Leis, 123",
    "endereco_numero": "123",
    "endereco_bairro": "Centro",
    "endereco_cidade": "Cidade Legal",
    "endereco_estado": "SP",
    "endereco_cep": "12345-678"
}
```

**Respostas:**

-   `201 Created`: Usuário criado com sucesso.
    ```json
    {
        "message": "Admin user registered successfully"
    }
    ```
-   `409 Conflict`: O `login` já existe.
    ```json
    {
        "error": "Login already exists"
    }
    ```

### 2. Login de Usuário

Endpoint para autenticar qualquer tipo de usuário (Admin, Advogado, Estagiario) e obter um token de acesso.

-   **Endpoint**: `POST /login`
-   **Autenticação**: Nenhuma
-   **Descrição**: Autentica um usuário e retorna um token JWT.

**Corpo da Requisição (Request Body):**

```json
{
    "login": "admin_login",
    "senha": "uma_senha_forte"
}
```

**Respostas:**

-   `200 OK`: Login bem-sucedido.
    ```json
    {
        "token": "<seu_token_jwt>"
    }
    ```
-   `401 Unauthorized`: Credenciais inválidas.
    ```json
    {
        "error": "Invalid login or senha"
    }
    ```

### 3. Criação de Novos Funcionários

Endpoint **protegido** para que um Admin possa criar novos funcionários (Advogados ou Estagiários) para seu escritório.

-   **Endpoint**: `POST /employees`
-   **Autenticação**: **Obrigatória** (Token de Admin)
-   **Descrição**: Cria um novo usuário com role `Advogado` ou `Estagiario`.

**Cabeçalho da Requisição (Headers):**

```
Authorization: Bearer <token_do_admin>
```

**Corpo da Requisição (Request Body):**

*Exemplo para criar um **Advogado**:*

```json
{
    "nome": "Dr. Carlos",
    "email": "carlos.adv@escritorio.com",
    "login": "carlos.adv",
    "senha": "senha_adv_123",
    "role": "Advogado",
    "oab": "AL123456"
}
```

*Exemplo para criar um **Estagiário**:*

```json
{
    "nome": "Alice",
    "email": "ali.estag@escritorio.com",
    "login": "ali.estag",
    "senha": "senha_estag_456",
    "role": "Estagiario"
}
```

**Respostas:**

-   `201 Created`: Funcionário criado com sucesso.
    ```json
    {
        "message": "Advogado created successfully"
    }
    ```
-   `401 Unauthorized`: Token ausente, inválido ou expirado.
-   `403 Forbidden`: O usuário autenticado não é um Admin.
    ```json
    {
        "error": "Only Admins can create employees"
    }
    ```
-   `409 Conflict`: O `login` do novo funcionário já existe.

### 4. Remoção de Funcionários

Endpoint **protegido** para que um Admin possa remover um funcionário de seu escritório.

-   **Endpoint**: `DELETE /employees/<employee_id>`
-   **Autenticação**: **Obrigatória** (Token de Admin)
-   **Descrição**: Remove a conta de um funcionário.

**Parâmetros da URL:**

-   `employee_id`: O ID do funcionário a ser removido (ex: `user_...`).

**Cabeçalho da Requisição (Headers):**

```
Authorization: Bearer <token_do_admin>
```

**Respostas:**

-   `200 OK`: Funcionário removido com sucesso.
    ```json
    {
        "message": "Employee deleted successfully"
    }
    ```
-   `401 Unauthorized`: Token ausente, inválido ou expirado.
-   `403 Forbidden`: O usuário autenticado não é um Admin ou o funcionário não pertence ao seu escritório.
-   `404 Not Found`: O `employee_id` não foi encontrado.
