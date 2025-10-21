# Plano de Testes da API de Usuários (Flask)

Este plano de testes visa verificar a funcionalidade dos endpoints públicos (`/register`, `/login`) e do endpoint protegido (`/employees`), focando nas lógicas de autenticação (JWT) and autorização (Role: Admin).

- **Tecnologia**: Flask/Python
- **Ferramenta**: PowerShell com `Invoke-RestMethod`
- **URL Base**: `http://127.0.0.1:5000`

---

## 🚀 0. Setup Inicial

**Pré-requisito**: A aplicação deve estar em execução em `http://127.0.0.1:5000` (`python app.py`).

### 0.1 Registro do Usuário Base (Admin)

Cria o usuário **Admin** necessário para os testes de endpoints protegidos.

```powershell
$body = @{
    nome = "Test User";
    email = "test@example.com";
    login = "testuser";
    senha = "testpassword";
    cnpj = "12345678901234";
    razao_social = "Test Company";
    nome_fantasia = "Test Company";
    endereco_rua = "Test Street";
    endereco_numero = "123";
    endereco_bairro = "Test Neighborhood";
    endereco_cidade = "Test City";
    endereco_estado = "TS";
    endereco_cep = "12345-678"
}

Invoke-RestMethod -Uri http://127.0.0.1:5000/register -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $body)
```

**Resultado Esperado**: `message: Admin user registered successfully`

### 0.2 Obter e Armazenar Token do Admin

Este bloco obtém e armazena o token JWT do Admin para ser usado nos testes autenticados.

```powershell
# 1. Login Admin
$loginAdmin = @{ login = "testuser"; senha = "testpassword" }
$AdminResponse = Invoke-RestMethod -Uri http://127.0.0.1:5000/login -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $loginAdmin)

# 2. Armazena o Token do Admin
$AdminToken = $AdminResponse.token

# 3. Headers para requisições autenticadas
$AdminHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $AdminToken"
}

Write-Host "Token do Admin (usado nos testes protegidos): $AdminToken"
```

---

## 1. Testes de Endpoints Públicos

| Teste | Cenário                | Endpoint    | Método | Status Esperado     |
|-------|------------------------|-------------|--------|---------------------|
| 1.1   | Login de Sucesso       | `/login`    | POST   | 200 (Retorna JWT)   |
| 1.2   | Login Inválido (Senha) | `/login`    | POST   | 401 (Unauthorized)  |
| 1.3   | Registro Duplicado     | `/register` | POST   | 409 (Conflict)      |

### Teste 1.1: Login (Sucesso)

```powershell
$body = @{ login = "testuser"; senha = "testpassword" }
Invoke-RestMethod -Uri http://127.0.0.1:5000/login -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $body)
```
**Saída Esperada**: `{ "token": "..." }`

### Teste 1.2: Login (Falha - Credenciais Inválidas)

```powershell
$body = @{ login = "testuser"; senha = "wrongpassword" }
Invoke-RestMethod -Uri http://127.0.0.1:5000/login -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $body)
```
**Saída Esperada**: `{ "error": "Invalid login or senha" }`

### Teste 1.3: Registro (Falha - Login Duplicado)

```powershell
$body = @{
    nome = "Duplicate User"; email = "duplicate@example.com"; login = "testuser"; senha = "pass";
    cnpj = "11111111111111"; razao_social = "Duplicate Co"
}
Invoke-RestMethod -Uri http://127.0.0.1:5000/register -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $body)
```
**Saída Esperada**: `{ "error": "Login already exists" }`

---

## 2. Testes de Endpoints Protegidos (Por Role)

### 2.1 Role: Admin (Escritório)

O Admin deve conseguir criar novos funcionários (Advogado/Estagiario).

| Teste   | Cenário                      | Endpoint     | Método | Token | Status Esperado    |
|---------|------------------------------|--------------|--------|-------|--------------------|
| 2.1.1   | Criar Advogado (Sucesso)     | `/employees` | POST   | Admin | 201 (Created)      |
| 2.1.2   | Acesso Negado (Token Ausente)| `/employees` | POST   | N/A   | 401 (Unauthorized) |

#### Teste 2.1.1: Criar Advogado (Sucesso)

*Depende da variável `$AdminHeaders` definida no Setup Inicial.*

```powershell
$body = @{
    nome = "Advogado Teste"; email = "advogado@test.com";
    login = "advogadouser"; senha = "advogadopass"; role = "Advogado"; oab = "AL1234"
}

Invoke-RestMethod -Uri http://127.0.0.1:5000/employees -Method Post -Headers $AdminHeaders -Body (ConvertTo-Json $body)
```
**Saída Esperada**: `{ "message": "Advogado created successfully" }`

#### Teste 2.1.2: Acesso Negado (Token Ausente)

```powershell
$body = @{
    nome = "Fail User"; email = "fail@test.com";
    login = "failuser"; senha = "failpass"; role = "Advogado"; oab = "AL1234"
}
# Sem o parâmetro -Headers de autenticação
Invoke-RestMethod -Uri http://127.0.0.1:5000/employees -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $body)
```
**Saída Esperada**: `{ "error": "Token is missing" }`

### 2.2 Role: Advogado/Estagiario (Usuário Comum)

Usuários não-Admin não devem conseguir criar outros funcionários.

**Pré-requisito**: Obter Token do Advogado

```powershell
# 1. Login Advogado
$loginAdvogado = @{ login = "advogadouser"; senha = "advogadopass" }
$AdvogadoResponse = Invoke-RestMethod -Uri http://127.0.0.1:5000/login -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $loginAdvogado)

# 2. Armazena o Token do Advogado
$AdvogadoToken = $AdvogadoResponse.token

# 3. Headers para requisições autenticadas com o token do Advogado
$AdvogadoHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $AdvogadoToken"
}
```

| Teste   | Cenário              | Endpoint     | Método | Token    | Status Esperado   |
|---------|----------------------|--------------|--------|----------|-------------------|
| 2.2.1   | Autorização Negada   | `/employees` | POST   | Advogado | 403 (Forbidden)   |

#### Teste 2.2.1: Tentar Criar Funcionário (Falha - 403 Forbidden)

*Depende da variável `$AdvogadoHeaders` definida acima.*

```powershell
$body = @{
    nome = "Estagiario Teste"; email = "estagiario@test.com";
    login = "estagiarioteste"; senha = "estagpass"; role = "Estagiario"
}

Invoke-RestMethod -Uri http://127.0.0.1:5000/employees -Method Post -Headers $AdvogadoHeaders -Body (ConvertTo-Json $body)
```
**Saída Esperada**: `{ "error": "Only Admins can create employees" }`

### 2.3 Role: Admin - Remoção de Funcionário

O Admin deve conseguir remover funcionários do seu próprio escritório.

**Pré-requisito**: Criar um funcionário para ser removido e obter seu ID.

```powershell
# Cria um Estagiário para ser deletado
$bodyToDelete = @{
    nome = "Usuario A Ser Removido"; email = "delete@test.com";
    login = "deleteuser"; senha = "deletepass"; role = "Estagiario"
}
$userToDeleteResponse = Invoke-RestMethod -Uri http://127.0.0.1:5000/employees -Method Post -Headers $AdminHeaders -Body (ConvertTo-Json $bodyToDelete)

# Assume que a API retorna o ID do usuário criado ou que podemos buscá-lo
# Para este teste, vamos assumir que o ID é conhecido ou pode ser lido do arquivo data/usuarios.json
# (Em um cenário real, a API de criação poderia retornar o ID)

# Vamos simular a busca do ID (leitura manual para o teste)
$allUsers = Get-Content -Path .\data\usuarios.json | ConvertFrom-Json
$EmployeeIdToDelete = ($allUsers | Where-Object { $_.login -eq 'deleteuser' } | Select-Object -ExpandProperty id)

Write-Host "ID do funcionário a ser removido: $EmployeeIdToDelete"
```

| Teste   | Cenário                               | Endpoint                      | Método | Token | Status Esperado    |
|---------|---------------------------------------|-------------------------------|--------|-------|--------------------|
| 2.3.1   | Remover Funcionário (Sucesso)         | `/employees/{employee_id}`    | DELETE | Admin | 200 (OK)           |
| 2.3.2   | Remover Funcionário Inexistente       | `/employees/user_invalid_id`  | DELETE | Admin | 404 (Not Found)    |

#### Teste 2.3.1: Remover Funcionário (Sucesso)

*Depende das variáveis `$AdminHeaders` e `$EmployeeIdToDelete`.*

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5000/employees/$EmployeeIdToDelete -Method Delete -Headers $AdminHeaders
```
**Saída Esperada**: `{ "message": "Employee deleted successfully" }`

#### Teste 2.3.2: Remover Funcionário Inexistente (Falha)

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5000/employees/user_invalid_id -Method Delete -Headers $AdminHeaders
```
**Saída Esperada**: `{ "error": "Employee not found" }`