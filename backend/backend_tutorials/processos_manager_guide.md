# Guia da API de Processos

Este documento descreve como interagir com a API de gerenciamento de processos.

## URL Base

A URL base para todas as requisições da API é:

```
http://127.0.0.1:5001
```

---

## Autenticação

A API de processos não requer autenticação.

---

## Endpoints da API

A seguir estão os detalhes de cada endpoint disponível.

### 1. Listar todos os processos

-   **Endpoint**: `GET /processos`
-   **Descrição**: Retorna uma lista de todos os processos cadastrados.

**Exemplo com PowerShell:**
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5001/processos -Method Get
```

### 2. Obter um processo específico

-   **Endpoint**: `GET /processos/<processo_id>`
-   **Descrição**: Retorna um processo com base no `id` fornecido.

**Exemplo com PowerShell:**
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5001/processos/proc_001 -Method Get
```

### 3. Criar um novo processo

-   **Endpoint**: `POST /processos`
-   **Descrição**: Cria um novo processo. O ID é gerado automaticamente.

**Exemplo com PowerShell:**
```powershell
$body = @{
    numero_processo = "0009876-54.2023.8.26.0003";
    descricao = "Execução de Título Extrajudicial";
    cliente_nome = "Banco ABC S.A.";
    responsavel_id = "user_adv_02";
    data_criacao = "2023-05-10T11:00:00Z";
    data_prazo = "2024-01-20T23:59:59Z"
}

# Serializa para JSON e salva como UTF-8 sem BOM
$json = $body | ConvertTo-Json -Depth 10
$utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Invoke-RestMethod -Uri http://127.0.0.1:5001/processos -Method Post `
    -ContentType 'application/json' -Body $utf8Bytes

```

### 4. Atualizar um processo

-   **Endpoint**: `PUT /processos/<processo_id>`
-   **Descrição**: Atualiza um processo existente com base no `id`.

**Exemplo com PowerShell:**
```powershell
$body = @{
    descricao = "Ação de Indenização por Danos Morais e Materiais";
    data_prazo = "2023-09-30T23:59:59Z"
}

Invoke-RestMethod -Uri http://127.0.0.1:5001/processos/proc_001 -Method Put -ContentType 'application/json' -Body (ConvertTo-Json $body)
```

### 5. Deletar um processo

-   **Endpoint**: `DELETE /processos/<processo_id>`
-   **Descrição**: Deleta um processo com base no `id`.

**Exemplo com PowerShell:**
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5001/processos/proc_001 -Method Delete
```
