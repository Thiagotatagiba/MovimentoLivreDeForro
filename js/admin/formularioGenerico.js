// Motor genérico de formulário, dirigido por um schema de campos. Não sabe
// nada sobre "Evento" especificamente — quando Marca, Local ou Festival
// ganharem cadastro no painel, é só escrever um novo schema (ver
// eventoCampos.js como exemplo) e reaproveitar este arquivo inteiro.
//
// Cada campo do schema: { grupo, nome, label, tipo, obrigatorio, opcoes,
// placeholder, hint, somenteLeitura, ler(dados), escrever(resultado, valor) }
// `ler`/`escrever` só são necessários quando o campo não mapeia direto pra
// uma propriedade de mesmo nome no objeto (ex. campos aninhados como
// ingresso.tipo, ou arrays representados como texto separado por vírgula).

export function criarFormulario(container, schema, { onChange } = {}) {
  container.innerHTML = "";
  const grupos = new Map();
  schema.forEach((campo) => {
    if (!grupos.has(campo.grupo)) grupos.set(campo.grupo, []);
    grupos.get(campo.grupo).push(campo);
  });

  function criarCampo(campo) {
    const wrap = document.createElement("div");
    wrap.className = "admin-field";
    wrap.dataset.campo = campo.nome;

    const label = document.createElement("label");
    label.setAttribute("for", `campo-${campo.nome}`);
    label.textContent = campo.label + (campo.obrigatorio ? " *" : "");
    wrap.appendChild(label);

    let input;
    if (campo.tipo === "select") {
      input = document.createElement("select");
      (campo.opcoes ?? []).forEach(([valor, rotulo]) => {
        const opt = document.createElement("option");
        opt.value = valor;
        opt.textContent = rotulo;
        input.appendChild(opt);
      });
    } else if (campo.tipo === "textarea") {
      input = document.createElement("textarea");
    } else {
      input = document.createElement("input");
      input.type = campo.tipo || "text";
    }
    input.id = `campo-${campo.nome}`;
    input.name = campo.nome;
    if (campo.somenteLeitura) {
      input.readOnly = true;
      input.tabIndex = -1;
    }
    if (campo.placeholder) input.placeholder = campo.placeholder;
    input.addEventListener("input", () => onChange?.(campo.nome, input));
    wrap.appendChild(input);

    if (campo.hint) {
      const hint = document.createElement("p");
      hint.className = "admin-field-hint";
      hint.textContent = campo.hint;
      wrap.appendChild(hint);
    }
    const erro = document.createElement("p");
    erro.className = "admin-field-error";
    erro.hidden = true;
    wrap.appendChild(erro);

    return wrap;
  }

  grupos.forEach((campos, nomeGrupo) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "admin-fieldset";
    const legend = document.createElement("legend");
    legend.textContent = nomeGrupo;
    fieldset.appendChild(legend);

    const grid = document.createElement("div");
    grid.className = "admin-field-grid cols-2";
    campos.forEach((campo) => grid.appendChild(criarCampo(campo)));
    fieldset.appendChild(grid);

    container.appendChild(fieldset);
  });

  return {
    /** Preenche o formulário a partir de um objeto de dados. */
    preencher(dados) {
      schema.forEach((campo) => {
        const el = container.querySelector(`#campo-${campo.nome}`);
        if (!el) return;
        const valor = campo.ler ? campo.ler(dados) : dados[campo.nome];
        el.value = valor ?? "";
      });
    },
    /** Lê o formulário de volta pra um objeto de dados. */
    ler() {
      const resultado = {};
      schema.forEach((campo) => {
        const el = container.querySelector(`#campo-${campo.nome}`);
        if (!el) return;
        if (campo.escrever) {
          campo.escrever(resultado, el.value);
        } else {
          resultado[campo.nome] = el.value;
        }
      });
      return resultado;
    },
    /** Marca campos com erro (`{ nomeDoCampo: "mensagem" }`) e limpa os demais. */
    mostrarErros(erros) {
      container.querySelectorAll(".admin-field").forEach((wrap) => {
        const msg = erros[wrap.dataset.campo];
        wrap.classList.toggle("has-error", Boolean(msg));
        const erroEl = wrap.querySelector(".admin-field-error");
        erroEl.textContent = msg ?? "";
        erroEl.hidden = !msg;
      });
    },
    campoEl(nome) {
      return container.querySelector(`#campo-${nome}`);
    },
  };
}
