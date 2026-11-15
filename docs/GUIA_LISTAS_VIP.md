# Como usar listas VIP e de desconto

Atualizado em 15/11/2026. Funcionalidade **publicada em produção**: [Gestão de listas VIP](https://vaiterforro.com.br/admin/listas.html). Entre na sua conta autorizada. Para testes, use somente dados fictícios no ambiente separado de homologação. Não há senhas neste guia. [Registro da publicação](PUBLICACAO_ADMINISTRATIVA_2026-11-15.md).

## Para quem organiza o evento

### Criar uma lista

1. Abra `/admin/listas.html`, ou **Listas VIP e desconto** na gestão de eventos.
2. Entre na conta autorizada e escolha a edição em **Edição do evento**. O nome da marca aparece junto ao evento.
3. Se não houver lista, informe título e termos claros: qual desconto/benefício, condições de entrada e limite de horário. O benefício não é um ingresso comprado pelo sistema.
4. Preencha **Prazo de inscrição** e o início/fim da **validade do benefício**. São horários diferentes: a inscrição pode fechar às 19h e o desconto valer das 20h às 23h. As telas exibem o fuso deste dispositivo; confira o relógio/fuso antes de confirmar.
5. Escolha o máximo de acompanhantes: **0** para individual; **1 a 10** para permitir até essa quantidade, além do titular. A pessoa pode levar menos acompanhantes que o máximo.
6. Clique em **Revisar criação**, confira e confirme.
7. Copie o endereço no campo **Link público para compartilhar**, ou abra **Abrir página pública da lista**. Na página do evento, também aparece um botão para essa lista.

Somente quem tem **Gerenciar listas** ou é administrador da marca/sistema pode criar ou encerrar. Permissão de editar/publicar eventos, sozinha, não permite gerenciar listas. Uma edição tem no máximo uma lista. Termos, limite e prazos ficam fixos depois da criação nesta versão; confira antes de confirmar.

O link da lista é público e estável. Ele mostra as condições do benefício, mas **não mostra os nomes de terceiros**. Ele é diferente de um convite privado para participar da equipe.

### Acompanhar inscrições

Quem tem **Gerenciar listas** ou **Consultar listas** vê os grupos na gestão. A atualização ocorre automaticamente a cada cinco segundos com a página visível. O botão **Atualizar** força uma nova leitura; preserve suas edições antes de usá-lo.

Cada grupo tem um titular com avatar (ou inicial) e seus acompanhantes identificados por letras. O painel mostra totais de titulares e pessoas. Nomes possivelmente duplicados são sinalizados apenas ao produtor: o sistema não bloqueia inscrições por esse motivo. A sinalização compara nomes sem diferenciar maiúsculas/minúsculas e com espaços normalizados; não garante identidade de pessoas.

### Encerrar a lista

O servidor considera a lista encerrada assim que o prazo termina, mesmo sem ninguém estar com a tela aberta. Para antecipar, clique em **Encerrar inscrições agora** e confirme. É definitivo: não há botão de reabrir. Os grupos e a auditoria permanecem preservados.

Cancelamento ou interrupção publicados do evento também encerram a lista de forma permanente. Confirmar o evento posteriormente não reabre essa lista.

Se o evento for **adiado**, as inscrições ficam suspensas até o produtor confirmar uma nova data. Em **Confirmar nova data publicada**, confira a data/hora que aparece na confirmação **e** os prazos/validade do benefício. Só confirme se esses termos continuam válidos. A confirmação vale apenas para aquela versão publicada; outra publicação ainda adiada exige nova conferência. Uma lista já encerrada, inclusive por prazo, não será reaberta por essa ação.

### Corrigir nomes após o fechamento

Depois de encerrada, **Gerenciar listas** permite corrigir nomes em cada grupo. **Consultar listas** permite apenas visualizar/exportar.

1. Edite **Corrigir nome do titular** e os nomes dos acompanhantes.
2. Mantenha exatamente a mesma quantidade de acompanhantes. Não acrescente, remova ou troque o grupo por outro grupo de tamanho diferente.
3. Clique em **Revisar correção**, confira e confirme.

O sistema registra o valor anterior, o novo, o autor e o instante. Essa é uma correção de nomes; não é uma autorização para cadastrar pessoas novas após o prazo. Correções não modificam cópias já enviadas por WhatsApp ou outro canal.

### Copiar a lista para compartilhar

Antes do fechamento, o sistema não oferece exportação/cópia da lista completa. Depois, aparece **Preparar texto**. Clique, confira o texto e use **Copiar texto**. Se o navegador bloquear a área de transferência, selecione e copie o texto no campo disponível.

Exemplo:

```text
Lista VIP

1. Maria
   A. Ana
   B. Bruno

2. Pedro

Total de pessoas: 4
```

O formato é texto simples, sem fotos, IDs de conta ou CSV. Gere novamente depois de uma correção e confira a colagem antes de enviar. O sistema prepara/copia o texto; não envia mensagens por conta própria.

## Para quem quer se inscrever

1. Abra o link da lista ou o botão de lista VIP na página do evento.
2. Leia os termos, o prazo, a validade do benefício e o limite de acompanhantes.
3. Entre na sua própria conta. A inscrição é para você como titular; acompanhantes não precisam ter conta.
4. Informe seu nome e os nomes dos acompanhantes, um por linha. Não ultrapasse o limite.
5. Marque que leu/aceitou os termos, clique em **Revisar inscrição** e confirme.
6. Aguarde **Sua inscrição está ativa**. A página mostra somente seu grupo.

Enquanto a lista estiver aberta, você pode alterar os nomes/acompanhantes ou usar **Cancelar minha inscrição**. Cancelar retira o grupo inteiro da lista ativa. É possível se reinscrever antes do fechamento; o sistema mantém uma única inscrição por conta naquela lista.

Depois do prazo ou encerramento manual, você continua podendo consultar seu grupo, mas não pode alterar ou cancelar. Para erro de grafia, fale com o produtor, que poderá corrigir os nomes sem aumentar a quantidade. Inscrições não são transferidas para outra edição automaticamente.

## Problemas comuns

| Situação | Como resolver |
| --- | --- |
| A lista não aparece | Confira o link completo e se o evento está público/ativo. |
| Não aparece o formulário de criação | Confira permissão, edição selecionada e se já existe lista. |
| “Inscrições suspensas” | Aguarde o produtor confirmar nova data; evento oculto/inativo também bloqueia novas inscrições. |
| “Lista encerrada” | O prazo terminou ou houve encerramento. Não tente contornar o bloqueio com outra solicitação. |
| Conflito de revisão | Preserve o que digitou, use **Atualizar**, confira os dados e revise novamente. Nada é sobrescrito automaticamente. |
| Falha de conexão ao confirmar | Tente novamente sem mudar os dados; a tela reutiliza a solicitação quando o resultado é incerto. |
| Não recebi e-mail | Esta funcionalidade confirma na própria tela. O envio automático de convites de equipe continua desativado e é um fluxo separado. |

Não publique capturas do painel do produtor com nomes reais. Para suporte técnico, informe a lista, a ação e o horário aproximado por canal apropriado, sem compartilhar senhas ou chaves. Detalhes técnicos: [LISTAS_VIP_IMPLEMENTACAO.md](LISTAS_VIP_IMPLEMENTACAO.md).
