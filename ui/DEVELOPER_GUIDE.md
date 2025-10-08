# Guia do Desenvolvedor - JurisFlow Frontend

## Arquitetura do Frontend

O frontend do JurisFlow foi refatorado seguindo padrões de engenharia de software para facilitar o desenvolvimento, manutenção e escalabilidade.

### Estrutura de Arquivos

```
ui/
├── index.html                 # Página principal
├── styles.css                # Estilos globais
├── components/               # Componentes HTML modulares
│   ├── header.html
│   ├── navigation.html
│   ├── landing-page.html
│   ├── auth-pages.html
│   ├── main-system.html
│   └── modals.html
├── js/
│   ├── app.js               # Ponto de entrada da aplicação
│   ├── core/                # Classes principais
│   │   └── App.js
│   └── services/            # Serviços modulares
│       ├── ApiService.js
│       ├── AuthService.js
│       ├── NavigationService.js
│       ├── PermissionService.js
│       ├── DocumentService.js
│       ├── DeadlineService.js
│       ├── HearingService.js
│       └── ProcessService.js
└── DEVELOPER_GUIDE.md       # Este arquivo
```

## Padrões Arquiteturais

### 1. Separação de Responsabilidades

- **HTML**: Estrutura e componentes modulares
- **CSS**: Estilos organizados por componentes
- **JavaScript**: Lógica separada em serviços especializados

### 2. Padrão de Serviços

Cada funcionalidade do sistema possui seu próprio serviço:

- `ApiService`: Comunicação com backend
- `AuthService`: Autenticação e autorização
- `NavigationService`: Navegação entre páginas
- `PermissionService`: Controle de permissões
- `DocumentService`: Operações com documentos
- `DeadlineService`: Operações com prazos
- `HearingService`: Operações com audiências
- `ProcessService`: Operações com processos

### 3. Gerenciamento de Estado

O estado da aplicação é centralizado na classe `App`:

```javascript
this.state = {
  user: null,           // Dados do usuário
  token: null,          // Token JWT
  currentPage: 'landing', // Página atual
  isLoading: false      // Estado de carregamento
};
```

### 4. Sistema de Componentes

Os componentes HTML são carregados dinamicamente e injetados nos containers apropriados.

## Como Adicionar Novas Funcionalidades

### 1. Criar um Novo Serviço

```javascript
class NovoService {
  constructor(app) {
    this.app = app;
    this.api = app.getService('api');
  }

  async novaOperacao() {
    try {
      const response = await this.api.get('/api/nova-rota');
      if (response.ok) {
        // Processar resposta
      } else {
        this.api.handleError(response, 'Nova operação');
      }
    } catch (error) {
      this.app.handleError(error);
    }
  }
}

// Registrar o serviço
app.registerService('novo', new NovoService(app));
```

### 2. Adicionar Nova Página

1. Criar componente HTML em `components/nova-pagina.html`
2. Adicionar método de navegação em `NavigationService`
3. Atualizar `loadComponents()` em `app.js`

### 3. Adicionar Novo Modal

1. Adicionar HTML do modal em `components/modals.html`
2. Criar métodos de abertura/fechamento no serviço apropriado
3. Adicionar botões de trigger na interface

### 4. Adicionar Nova API

1. Adicionar métodos no `ApiService` se necessário
2. Criar métodos específicos no serviço da funcionalidade
3. Implementar tratamento de erros adequado

## Convenções de Código

### Nomenclatura

- **Classes**: PascalCase (`DocumentService`)
- **Métodos**: camelCase (`createDocument`)
- **Variáveis**: camelCase (`userData`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **IDs de elementos**: camelCase (`docTitleInput`)

### Estrutura de Métodos

```javascript
/**
 * Descrição do método
 * @param {string} param1 - Descrição do parâmetro
 * @param {Object} param2 - Descrição do parâmetro
 * @returns {Promise<Object>} Descrição do retorno
 */
async metodoExemplo(param1, param2) {
  try {
    // Validação de parâmetros
    if (!param1) {
      throw new Error('Parâmetro obrigatório');
    }

    // Lógica principal
    const response = await this.api.get(`/api/endpoint/${param1}`);
    
    if (response.ok) {
      return response.data;
    } else {
      this.api.handleError(response, 'Operação');
    }
  } catch (error) {
    this.app.handleError(error);
  }
}
```

### Tratamento de Erros

- Use `this.app.handleError(error)` para erros gerais
- Use `this.api.handleError(response, operation)` para erros de API
- Sempre forneça mensagens de erro claras para o usuário

### Logging

- Use `console.log()` para informações de debug
- Use `console.error()` para erros
- Use `console.warn()` para avisos

## Testes e Debugging

### Console do Navegador

O sistema inclui logs detalhados para debugging:

```javascript
console.log('[ServiceName] Operation started');
console.log('[ServiceName] Response received:', data);
console.error('[ServiceName] Operation failed:', error);
```

### Ferramentas de Desenvolvimento

1. **Chrome DevTools**: Para debugging JavaScript
2. **Network Tab**: Para monitorar requisições API
3. **Console**: Para logs e debugging interativo

## Performance

### Otimizações Implementadas

1. **Carregamento Lazy**: Componentes carregados sob demanda
2. **Debouncing**: Para operações de busca
3. **Caching**: Token JWT armazenado no localStorage
4. **Error Boundaries**: Tratamento de erros sem quebrar a aplicação

### Boas Práticas

1. **Minimize DOM Queries**: Cache elementos DOM quando possível
2. **Event Delegation**: Use event listeners no nível superior
3. **Async/Await**: Prefira promises para operações assíncronas
4. **Error Handling**: Sempre trate erros adequadamente

## Manutenção

### Atualizações de Dependências

1. Verifique compatibilidade antes de atualizar
2. Teste todas as funcionalidades após atualização
3. Mantenha logs de mudanças

### Refatoração

1. Mantenha a compatibilidade com APIs existentes
2. Teste cada mudança incrementalmente
3. Documente mudanças significativas

## Troubleshooting

### Problemas Comuns

1. **Componente não carrega**: Verifique se o arquivo existe e a rota está correta
2. **Serviço não funciona**: Verifique se foi registrado corretamente
3. **Erro de permissão**: Verifique se o usuário tem as permissões necessárias
4. **API não responde**: Verifique a conectividade e logs do servidor

### Debugging

1. Abra o console do navegador
2. Verifique os logs de erro
3. Use breakpoints para debugging interativo
4. Monitore as requisições de rede

## Contribuição

### Antes de Fazer Mudanças

1. Leia este guia completamente
2. Entenda a arquitetura existente
3. Teste suas mudanças localmente
4. Documente novas funcionalidades

### Processo de Desenvolvimento

1. Crie uma branch para sua feature
2. Implemente as mudanças seguindo as convenções
3. Teste todas as funcionalidades
4. Documente as mudanças
5. Faça pull request com descrição detalhada

## Recursos Adicionais

- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
