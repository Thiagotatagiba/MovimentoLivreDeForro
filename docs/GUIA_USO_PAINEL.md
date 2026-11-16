# Como usar o painel — Vai Ter Forró!

Guia para responsáveis por marcas e equipes. Atualizado em 14/11/2026.

**Situação atual:** painel, convites e listas VIP publicados em produção em 15/11/2026. O envio automático de convites continua desativado. Veja também [GUIA_LISTAS_VIP.md](GUIA_LISTAS_VIP.md) e o [registro da publicação](PUBLICACAO_ADMINISTRATIVA_2026-11-15.md).

## 1. Entrar no ambiente certo

Em produção, abra [Gestão de eventos](https://vaiterforro.com.br/admin/gestao.html), [Equipe e convites](https://vaiterforro.com.br/admin/convites.html) ou [Listas VIP](https://vaiterforro.com.br/admin/listas.html), e entre na sua conta autorizada. Use o ambiente separado de homologação para testes com dados fictícios. As contas de teste são fornecidas por canal privado; este documento não contém senhas.

Para o desenvolvedor iniciar o servidor local ligado à homologação, consultar [HOMOLOGACAO_AUTH.md](HOMOLOGACAO_AUTH.md). Um servidor estático comum pode usar a configuração de produção do código; não o use para testar escritas administrativas sem a configuração de homologação.

Entre na conta autorizada. Estar cadastrado não concede administração: é necessário vínculo ativo com a marca. Se a marca ou ação não aparecer, confirme sua conta e peça ao administrador que verifique o vínculo e as permissões. Não altere metadados de usuário para tentar liberar acesso.

## 2. Convidar alguém para a equipe

Somente administrador ativo da marca ou administrador do sistema pode convidar.

1. Abra **Equipe e convites** e selecione a marca em **Convidar para uma marca**.
2. Informe o e-mail que a pessoa realmente usará para entrar. Não use um endereço alternativo que não esteja confirmado na conta dela.
3. Escolha **Equipe** para atribuir permissões específicas. Use **Administrador da marca** apenas quando a pessoa deve administrar a equipe e os eventos dessa marca.
4. Marque as permissões necessárias e clique em **Revisar convite**.
5. Confira marca, destinatário, papel e permissões na confirmação; confirme para criar.
6. Clique em **Copiar link do convite** e compartilhe em particular com a pessoa. Cole antes em um campo privado para conferir que a cópia funcionou; não publique o link em grupos ou redes sociais.

O link só fica disponível na sessão em que foi criado. Se perdê-lo, revogue o convite e crie outro. O convite vale sete dias. Criar um convite não concede acesso imediatamente. No estado atual, nenhum e-mail é enviado automaticamente.

| Permissão | Alcance |
| --- | --- |
| Editar a marca | Permissão registrada; a tela de edição de marca ainda não foi entregue neste painel. |
| Editar eventos | Editar e salvar rascunhos dos eventos existentes da marca. |
| Publicar eventos | Publicar rascunhos salvos e alterar a situação dos eventos publicados. |
| Gerenciar listas | Criar/encerrar listas, conferir grupos e corrigir nomes após fechamento. |
| Consultar listas | Conferir grupos e preparar texto após fechamento; não permite criar, encerrar ou corrigir. |

Editar e publicar são permissões separadas. Uma pessoa que só publica não pode editar o rascunho. Um administrador da marca tem as permissões de administração dessa marca, não das demais.

## 3. Aceitar um convite recebido

1. Abra o link completo compartilhado pelo administrador.
2. Se necessário, clique em **Entrar com o e-mail convidado** e use a conta com exatamente esse e-mail primário confirmado.
3. Confira marca, papel, permissões e validade.
4. Clique em **Aceitar convite** e confirme a revisão.
5. Abra **Gestão de eventos** para usar as ações liberadas.

O endereço pode perder o trecho final depois de abrir: o painel o retira da barra para proteger o token. Não copie o endereço já reduzido para reenviar o convite. Se o login abrir outra aba ou você demorar mais de quinze minutos, reabra o link original e tente novamente. O retorno de Google/Magic Link com convite ainda precisa de validação específica; em homologação, siga o método de login indicado pelo responsável técnico.

Convite vencido ou revogado não pode ser aceito. Se o administrador que convidou perdeu sua autoridade, peça um novo convite a um administrador ativo. Um convite não substitui silenciosamente as permissões de quem já é membro ativo; nesses casos, o administrador deve tratar a alteração de acesso pelo procedimento técnico disponível.

## 4. Acompanhar ou revogar um convite

Na seção **Convites que você pode acompanhar**, clique em **Atualizar lista**. Confira destinatário, marca, permissões, estado e validade. Um administrador autorizado pode usar **Revogar convite** e confirmar.

Revogar impede a aceitação de um convite pendente. Não remove a participação de quem já aceitou. A remoção ou alteração de um membro exige operação administrativa própria, que ainda não tem tela dedicada nesta entrega.

## 5. Criar um evento do zero

Selecione a marca e clique em **Novo evento**. O administrador do sistema pode criar para as marcas existentes sem produtores/equipes cadastrados. Administradores de marca/equipe precisam da permissão **Editar eventos** na marca selecionada. Se o botão não aparecer em um ambiente ainda sem a atualização, a entrega precisa ser ativada ali; veja [CRIACAO_EVENTOS.md](CRIACAO_EVENTOS.md).

1. Escolha o **Local desta edição**, entre os locais ativos já cadastrados.
2. Preencha título, data/hora de início e data/hora de término. Na madrugada, use a data seguinte para o término.
3. Confirme os horários e informe descrição, atrações e ingresso. Preço em branco significa não informado; zero representa gratuidade.
4. Opcionalmente informe uma **URL HTTPS pública da arte**. Envio de arquivo e substituição posterior de imagem ainda não têm tela dedicada; confira a arte antes de criar.
5. Clique em **Criar rascunho**. O evento passa a existir no painel, mas continua fora do catálogo.
6. Confira, clique em **Revisar publicação** e depois **Publicar agora**, se tiver essa permissão.
7. Use **Ver evento no site** para conferir a página e compartilhar seu endereço.

Não preencha ID ou endereço: são gerados automaticamente e permanecem estáveis. Marca/local ficam vinculados à edição. **Cancelar criação** descarta o formulário não salvo; não apaga uma edição já criada. Trocar de evento com dados pendentes pede confirmação.

## 6. Editar e publicar um evento existente

1. Abra **Gestão de eventos**, selecione a marca e o evento.
2. Atualize os campos necessários. Informe data e horário de início **e de término**. Se passar da meia-noite, use a data seguinte no término.
3. Para horários antigos estimados, confirme os horários com o produtor e marque a confirmação quando solicitada. Não transforme uma estimativa em horário confirmado sem conferência.
4. Clique em **Salvar rascunho**. Isso preserva a versão que o público está vendo.
5. Quem tiver permissão de publicação deve clicar em **Revisar publicação**, conferir o resumo e confirmar. Só então o rascunho passa a ser a versão pública no ambiente usado.

A opção **Exibir este evento no catálogo público** controla a visibilidade depois da publicação. Desmarcá-la no rascunho não muda imediatamente a versão pública. A imagem atual é exibida para conferência; esta tela ainda não faz upload ou substituição de imagem de uma edição existente. Para criar outra edição, use **Novo evento**.

Se aparecer **Outra pessoa alterou este rascunho**, compare as versões e escolha o que manter. **Preparar revisão escolhida** prepara os dados para sua revisão; não salva automaticamente. Confira e salve novamente. Evite recarregar antes de preservar alterações que deseja manter.

## 7. Cancelar, adiar ou interromper

Em **Situação do evento publicado**, escolha **Confirmado**, **Adiado**, **Cancelado** ou **Interrompido**, clique em **Revisar situação** e confirme. Exige permissão de publicação.

A situação é uma operação separada do rascunho. Cancelar ou adiar mantém a informação pública com o aviso correspondente; ocultar o evento é outra decisão, feita pelo campo de visibilidade e publicação. Antes de alterar, confira o evento e o ambiente para evitar avisos incorretos ao público.

## 8. Resolver problemas comuns

| O que aconteceu | O que fazer |
| --- | --- |
| Nenhuma marca aparece | Confira a conta e peça ao administrador que confira o vínculo ativo. |
| Convite não aparece ou não permite aceitar | Reabra o link original, confira e-mail primário confirmado, validade e estado. |
| Link foi perdido ou copiado incompleto | Administrador deve revogar e gerar outro; não é possível recuperar o token pela lista. |
| Não recebi e-mail | O envio automático ainda está desativado. Use o link particular compartilhado pelo administrador. |
| Falha de conexão ao confirmar | Tente novamente sem mudar os dados. O painel reutiliza a solicitação para evitar duplicação. |
| Botão de publicar não aparece ou está indisponível | Confira permissão, rascunho salvo, horários e confirmação dos dados. |
| Alteração não apareceu no site de produção | Homologação é separada. Salvar rascunho também não publica. Confira onde a operação foi feita. |

Para suporte, informe a tela, a marca/evento, a ação e o horário aproximado. Não envie senha, chave de API ou link completo de convite em chamados públicos. O responsável técnico encontra configuração e limites em [ENVIO_CONVITES.md](ENVIO_CONVITES.md) e [AGENDAMENTO_CONVITES.md](AGENDAMENTO_CONVITES.md).

## Condicoes especiais

No formulario do evento, abaixo de Descricao, clique em **+ Adicionar condicao**. Escolha **Aniversariante** ou **Outros** e descreva o beneficio e as regras (periodo do aniversario, documento, cadastro previo e horario limite). Voce pode adicionar varias condicoes ou remover uma linha. Linhas sem descricao sao ignoradas.

Clique em **Salvar rascunho** (ou **Criar rascunho** no evento novo), revise e publique. As condicoes aparecem na pagina publica somente depois da publicacao. Este campo informa regras; nao cadastra aniversariantes ou concede ingressos automaticamente.

## Cadastrar marcas e locais

No painel de eventos, clique em **Cadastrar marcas e locais**. Somente o administrador global tem esse acesso. Criar uma marca não atribui administradores ou produtores; convide a equipe separadamente.

1. Em **Novo local**, confira os nomes existentes e informe nome/tipo do espaço.
2. Busque o endereço, escolha uma sugestão e confira os campos de rua, número, bairro, cidade e UF. Você também pode preencher o endereço e clicar no mapa.
3. Ajuste o pino arrastando ou usando as setas do teclado e marque **Conferi o endereço e a posição do pino**. Alterar o endereço exige marcar o ponto novamente.
4. Clique em **Revisar cadastro do local**, confira os dados e **Cadastrar agora**. O cadastro oficial fica público imediatamente.
5. Em **Nova marca**, informe nome, descrição, cidade, frequência, categorias/dias e links públicos opcionais. Escolha o **Local padrão**, ou **Sem local fixo** para marca itinerante.
6. Revise e confirme. Volte aos eventos e atualize a página: a nova marca estará disponível, sem precisar cadastrar um produtor.

Marcas e locais existentes podem ser selecionados e editados na mesma tela. Endereços históricos são preservados conforme as regras abaixo. Logo e capa aceitam URL HTTPS; envio de arquivo continua pendente. A busca/mapa usa serviços públicos externos: se a busca falhar, preencha o endereço e marque no mapa; se o mapa não carregar, tente atualizar antes de cadastrar o local. O cadastro de marca continua disponível.

## Editar marcas e locais

1. Abra **Gerenciar marcas e locais** pelo painel de eventos.
2. Escolha a aba **Marcas** ou **Locais** e use **Selecionar marca/local para editar**.
3. Altere os dados e clique em **Revisar alterações**. Confira e use **Salvar alterações**.
4. Para começar outro cadastro, use **Limpar para nova marca/novo local**. Campos não salvos pedem confirmação antes de serem descartados.

IDs e slugs existentes são preservados. Logo/capa antigos em arquivos locais são mantidos quando não alterados; novos endereços de imagem devem ser HTTPS.

Se o local já tiver sido usado em alguma publicação, alterar endereço ou posição cria **um novo local**, preservando o cadastro anterior e os eventos. O novo endereço aparece como opção separada, identificado pela rua/cidade. Depois, edite a marca para escolhê-lo como local padrão de novas edições. O padrão não muda automaticamente, e eventos existentes não são transferidos.

Local sem publicação pode ter endereço corrigido no próprio cadastro. Dados de contato e descrição podem ser editados diretamente. Desativar uma marca/local oculta o cadastro e seus eventos vinculados do catálogo, preservando os registros; revise o aviso antes de salvar. Separe desativação e mudança de endereço quando houver publicações.

Se outra pessoa salvar primeiro, o painel informa conflito e mantém seu formulário. **Recarregar cadastro** busca a versão atual e pede confirmação antes de descartar alterações. Não há sobrescrita automática.

## Menu da Gestão — 16/11/2026

A entrada **Gestão** reúne cinco áreas no mesmo menu, disponível também nas telas internas: **Eventos**, **Locais**, **Marcas**, **Listas** e **Gerentes de marcas**. A área atual fica destacada.

Na entrada, os cartões oferecem **Cadastrar evento**, **Cadastrar local**, **Cadastrar marca**, **Cadastrar lista** e **Convidar gerente de marca**. Quem só consulta listas ou publica eventos vê ações de consulta/gerenciamento compatíveis com suas permissões.

Para começar do zero: cadastre o local, a marca e seu local padrão, depois o evento. Publique a edição antes de cadastrar sua lista VIP/desconto. O atalho de evento já abre o formulário novo; os atalhos de marca/local abrem a aba correta. Os seletores continuam disponíveis para editar cadastros existentes.

**Convidar gerente de marca** abre Equipe e convites com o papel **Gerente de marca (administrador)** selecionado. Escolha a marca, informe o e-mail e revise as permissões antes de criar o convite. O acesso só é concedido após a aceitação com e-mail verificado. O envio automático de e-mail continua desativado; compartilhe o link gerado. Também é possível escolher Equipe e permissões específicas.

Locais e marcas oficiais continuam restritos ao administrador global. Administrador de marca pode convidar gerentes da própria marca; membro de equipe só vê os acessos concedidos. Navegar e abrir formulários não cria registros nem envia convites.

## Criar a lista dentro do evento — 16/11/2026

1. Cadastre o evento, salve o rascunho e publique a edição.
2. No próprio formulário, abra **Lista VIP e desconto** e clique em **Criar lista deste evento**.
3. Preencha título, termos, prazo de inscrição, início/fim do benefício e acompanhantes. Horários usam o fuso deste dispositivo; não são preenchidos automaticamente.
4. Use **Revisar criação da lista**, confira o nome/data da edição e confirme em **Criar lista**. Termos/prazos continuam sem edição posterior nesta versão.
5. A seção passa a mostrar **Gerenciar lista deste evento**. A gestão abre com aquela edição fixada, e **Voltar ao evento** retorna à mesma edição. **Ver todas as listas** sai desse contexto explicitamente.

Se o evento ainda não estiver publicado ou houver alterações salvas ainda não publicadas, crie a lista após publicar. Se houver alterações não salvas, salve antes de continuar. Eventos cancelados/adiados/interrompidos não oferecem criação de lista nova; as listas existentes continuam seguindo as regras de suspensão/consulta já aprovadas.

O menu **Listas** continua sendo a visão geral de gerenciamento. A seção do evento mostra somente metadados; participantes são consultados na gestão da lista com as permissões existentes. Um link de evento indisponível não seleciona outra edição automaticamente. Navegar, abrir formulário ou revisar não cria lista.
