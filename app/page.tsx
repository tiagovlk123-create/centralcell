"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  custo: number;
  preco: number;
  estoque: number;
  codigo: string;
  cor?: string;
  foto?: string;
};

type ItemCarrinho = Produto & { qtdVenda: number };

const categorias = [
  "Tela",
  "Bateria",
  "Película",
  "Capinha",
  "Carregador",
  "Cabo Tipo-C",
  "Cabo Micro",
  "Cabo Tipo-C para Tipo-C",
  "Cabo USB",
  "Formatação Simples",
  "Formatação Geral",
  "Conserto de Placa",
  "Conserto de CPU",
  "Fone de Ouvido",
  "Conector de Carga",
  "Câmera",
  "Alto-falante",
  "Microfone",
  "Chip",
  "Memória",
  "Acessórios Gamer",
  "Suporte Veicular",
  "Power Bank",
  "Smartwatch",
  "Caixa de Som",
  "Outros",
];

const produtosIniciais: Produto[] = [
  { id: "1", nome: "Tela iPhone 11", categoria: "Tela", custo: 180, preco: 350, estoque: 5, codigo: "TEL-IP11" },
  { id: "2", nome: "Bateria Samsung A13", categoria: "Bateria", custo: 45, preco: 120, estoque: 8, codigo: "BAT-A13" },
  { id: "3", nome: "Película 3D iPhone", categoria: "Película", custo: 5, preco: 25, estoque: 30, codigo: "PEL-3D-IP" },
  { id: "4", nome: "Cabo Tipo-C Turbo", categoria: "Cabo USB", custo: 12, preco: 35, estoque: 20, codigo: "CAB-TC" },
];

export default function Home() {
  const [logado, setLogado] = useState(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("logado") === "true";
});
const [usuario, setUsuario] = useState("");
const [senha, setSenha] = useState("");
  const [tela, setTela] = useState("Dashboard");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [dataBuscaInicial, setDataBuscaInicial] = useState("");
  const [dataBuscaFinal, setDataBuscaFinal] = useState("");
  const vendasFiltradas = useMemo(() => {
  if (!dataBuscaInicial || !dataBuscaFinal) return [];

  const inicio = new Date(dataBuscaInicial + "T00:00:00");
  const fim = new Date(dataBuscaFinal + "T23:59:59");

  return vendas.filter((v) => {
    let dataVenda: Date;

    if (v.dataISO) {
      dataVenda = new Date(v.dataISO);
    } else {
      const dataTexto = String(v.data || "");
      const dataParte = dataTexto.split(",")[0];
      const horaParte = dataTexto.split(",")[1]?.trim() || "00:00:00";

      const [dia, mes, ano] = dataParte.split("/");
      const [hora, minuto, segundo] = horaParte.split(":");

      dataVenda = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia),
        Number(hora || 0),
        Number(minuto || 0),
        Number(segundo || 0)
      );
    }

    return dataVenda >= inicio && dataVenda <= fim;
  });
}, [vendas, dataBuscaInicial, dataBuscaFinal]);
const totalRelatorio = vendasFiltradas.reduce(
  (total, v) => total + Number(v.total || 0),
  0
);

const lucroRelatorio = vendasFiltradas.reduce(
  (total, v) => total + Number(v.lucro || 0),
  0
);

const quantidadeVendasRelatorio = vendasFiltradas.length;

const quantidadeProdutosRelatorio = vendasFiltradas.reduce(
  (total, v) =>
    total +
    (v.itens || []).reduce(
      (soma: number, item: any) => soma + Number(item.qtdVenda || 0),
      0
    ),
  0
);
const produtosVendidosRelatorio = useMemo(() => {
  const mapa = new Map();

  vendasFiltradas.forEach((v) => {
    (v.itens || []).forEach((item: any) => {
      const existente = mapa.get(item.id);

      const qtd = Number(item.qtdVenda || 0);
      const total = Number(item.preco || 0) * qtd;
      const lucro = (Number(item.preco || 0) - Number(item.custo || 0)) * qtd;

      if (existente) {
        existente.qtd += qtd;
        existente.total += total;
        existente.lucro += lucro;
      } else {
        mapa.set(item.id, {
          id: item.id,
          nome: item.nome,
          categoria: item.categoria,
          cor: item.cor || "-",
          codigo: item.codigo || "-",
          foto: item.foto,
          qtd,
          total,
          lucro,
        });
      }
    });
  });

  return Array.from(mapa.values());
}, [vendasFiltradas]);

  function gerarPDF() {
  const doc = new jsPDF("landscape");
  const inicio = dataBuscaInicial
  ? dataBuscaInicial.split("-").reverse().join("/")
  : "-";

const fim = dataBuscaFinal
  ? dataBuscaFinal.split("-").reverse().join("/")
  : "-";

  doc.setFontSize(18);
  doc.text("CENTRAL CELL REPAIR", 14, 15);

  doc.setFontSize(12);
  doc.text("Relatório de Vendas", 14, 23);
  doc.text(`Período: ${inicio} até ${fim}`, 14, 31);

  doc.text(`Total Vendido: R$ ${totalRelatorio.toFixed(2)}`, 14, 42);
  doc.text(`Lucro: R$ ${lucroRelatorio.toFixed(2)}`, 80, 42);
  doc.text(`Vendas: ${quantidadeVendasRelatorio}`, 130, 42);
  doc.text(`Produtos Vendidos: ${quantidadeProdutosRelatorio}`, 170, 42);

  autoTable(doc, {
    startY: 52,
    head: [["Produto", "Categoria", "Cor", "Código", "Qtd", "Total", "Lucro"]],
    body: produtosVendidosRelatorio.map((item: any) => [
      item.nome,
      item.categoria,
      item.cor,
      item.codigo,
      item.qtd,
      `R$ ${item.total.toFixed(2)}`,
      `R$ ${item.lucro.toFixed(2)}`,
    ]),
  });
  const agora = new Date();

const dataHora =
  agora.toLocaleDateString("pt-BR") +
  " " +
  agora.toLocaleTimeString("pt-BR");

doc.setFontSize(9);

doc.text(
  `Gerado em: ${dataHora}  |  Sistema Central Cell Repair`,
  14,
  doc.internal.pageSize.height - 10
);

  doc.save(`relatorio-${dataBuscaInicial || "inicio"}-${dataBuscaFinal || "fim"}.pdf`);
}
async function imprimirCupom() {
  const inicio = dataBuscaInicial
    ? dataBuscaInicial.split("-").reverse().join("/")
    : "-";

  const fim = dataBuscaFinal
    ? dataBuscaFinal.split("-").reverse().join("/")
    : "-";

  const itensTexto = produtosVendidosRelatorio
    .map(
      (item: any) => `
${item.nome}
Qtd: ${item.qtd}
R$ ${item.total.toFixed(2)}
`
    )
    .join("");

  const totalItens = produtosVendidosRelatorio.reduce(
    (soma: number, item: any) => soma + Number(item.qtd || 0),
    0
  );

  const conteudo = `
      CENTRAL CELL REPAIR
---------------------------------
Período:
${inicio} até ${fim}

${itensTexto}
---------------------------------
Itens: ${totalItens}
TOTAL: R$ ${totalRelatorio.toFixed(2)}
---------------------------------

Obrigado pela preferência!
`;

  try {
    const resposta = await fetch("http://localhost:9876/imprimir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texto: conteudo }),
    });

    if (!resposta.ok) {
      alert("Erro ao enviar cupom para o CentralCell Printer.");
      return;
    }

    alert("Cupom enviado para o CentralCell Printer.");
  } catch (erro) {
    alert("CentralCell Printer não está aberto. Inicie o driver primeiro.");
  }
}

const [menuAberto, setMenuAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<string | null>(null);

  const [novo, setNovo] = useState({
    nome: "",
    categoria: "Tela",
    custo: "",
    preco: "",
    estoque: "",
    codigo: "",
    cor: "",
    foto: "",
  });
  useEffect(() => {
  async function carregarProdutos() {
    const snapshot = await getDocs(collection(db, "produtos"));

    if (snapshot.empty) {
      setProdutos(produtosIniciais);
      return;
    }

    const lista: Produto[] = snapshot.docs.map((doc) => ({
      ...(doc.data() as Omit<Produto, "id">),
      id: doc.id,
    }));

    setProdutos(lista);
  }

  async function carregarVendas() {
    const snapshot = await getDocs(collection(db, "vendas"));

    const lista = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));

    setVendas(lista);
  }

  carregarProdutos();
  carregarVendas();
}, []);

  const valorEstoque = produtos.reduce((total, p) => total + p.custo * p.estoque, 0);
  const hoje = new Date().toLocaleDateString("pt-BR");

const vendasDeHoje = vendas.filter((v) =>
  String(v.data).startsWith(hoje)
);

const vendasHoje = vendasDeHoje.reduce((total, v) => total + Number(v.total || 0), 0);
const lucroHoje = vendasDeHoje.reduce((total, v) => total + Number(v.lucro || 0), 0);
  const estoqueBaixo = produtos.filter((p) => p.estoque <= 0).length;

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) =>
      `${p.nome} ${p.categoria} ${p.codigo} ${p.cor || ""}`
  .toLowerCase()
  .includes(busca.toLowerCase())
    );
  }, [produtos, busca]);
  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
  const arquivo = e.target.files?.[0];
  if (!arquivo) return;

  const leitor = new FileReader();

  leitor.onload = (evento) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const tamanho = 600;

      canvas.width = tamanho;
      canvas.height = tamanho;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, tamanho, tamanho);

      const escala = Math.min(tamanho / img.width, tamanho / img.height);
      const largura = img.width * escala;
      const altura = img.height * escala;
      const x = (tamanho - largura) / 2;
      const y = (tamanho - altura) / 2;

      ctx.drawImage(img, x, y, largura, altura);

      const fotoReduzida = canvas.toDataURL("image/jpeg", 0.7);

      setNovo((atual) => ({
  ...atual,
  foto: fotoReduzida,
}));
    };

    img.src = evento.target?.result as string;
  };

  leitor.readAsDataURL(arquivo);
}
function editarProduto(produto: Produto) {
  setProdutoEditando(produto.id);

  setNovo({
    nome: produto.nome,
    categoria: produto.categoria,
    custo: String(produto.custo),
    preco: String(produto.preco),
    estoque: String(produto.estoque),
    codigo: produto.codigo,
    cor: produto.cor || "",
    foto: produto.foto || "",
  });

  setTela("Produtos");
}

  async function cadastrarProduto() {
  if (!novo.nome || !novo.preco || !novo.estoque) {
    return alert("Preencha nome, preço e estoque.");
  }

  const produto = {
    nome: novo.nome,
    categoria: novo.categoria,
    custo: Number(novo.custo || 0),
    preco: Number(novo.preco),
    estoque: Number(novo.estoque),
    codigo: novo.codigo || `COD-${Date.now()}`,
    cor: novo.cor,
    foto: novo.foto,
  };

  if (produtoEditando) {
    await setDoc(doc(db, "produtos", produtoEditando), produto);

    setProdutos(
      produtos.map((p) =>
        p.id === produtoEditando ? { id: produtoEditando, ...produto } : p
      )
    );

    setProdutoEditando(null);
    alert("Produto atualizado com sucesso!");
  } else {
    const docRef = await addDoc(collection(db, "produtos"), produto);

    const produtoComId: Produto = {
      id: docRef.id,
      ...produto,
    };

    setProdutos([produtoComId, ...produtos]);
    alert("Produto cadastrado no Firebase com sucesso!");
  }

  setNovo({
    nome: "",
    categoria: "Tela",
    custo: "",
    preco: "",
    estoque: "",
    codigo: "",
    cor: "",
    foto: "",
  });
}

  function adicionarCarrinho(produto: Produto) {
    if (produto.estoque <= 0) return alert("Produto sem estoque.");

    const existe = carrinho.find((i) => i.id === produto.id);

    if (existe) {
      if (existe.qtdVenda >= produto.estoque) return alert("Quantidade maior que o estoque.");
      setCarrinho(carrinho.map((i) => i.id === produto.id ? { ...i, qtdVenda: i.qtdVenda + 1 } : i));
    } else {
      setCarrinho([...carrinho, { ...produto, qtdVenda: 1 }]);
    }
  }

  async function imprimirProduto(item: any) {
  const texto = `
${item.nome}
Qtd: ${item.qtd}
R$ ${item.total.toFixed(2)}

 Obrigado pela preferencia!
`;

  await fetch("http://localhost:9876/imprimir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto }),
  });
}

  async function finalizarVenda() {
  if (carrinho.length === 0) return alert("Carrinho vazio.");

  const total = carrinho.reduce((soma, item) => soma + item.preco * item.qtdVenda, 0);
  const custo = carrinho.reduce((soma, item) => soma + item.custo * item.qtdVenda, 0);
  const lucro = total - custo;

  const agora = new Date();

const venda = {
  data: agora.toLocaleString("pt-BR"),
  dataISO: agora.toISOString(),
  itens: carrinho,
  total,
  lucro,
};

  await addDoc(collection(db, "vendas"), venda);

  for (const item of carrinho) {
    const produtoRef = doc(db, "produtos", item.id);
    await updateDoc(produtoRef, {
      estoque: item.estoque - item.qtdVenda,
    });
  }

  setProdutos(produtos.map((p) => {
    const item = carrinho.find((i) => i.id === p.id);
    return item ? { ...p, estoque: p.estoque - item.qtdVenda } : p;
  }));

  setVendas([
    {
      id: Date.now(),
      ...venda,
    },
    ...vendas,
  ]);

  setCarrinho([]);
  alert("Venda finalizada com sucesso!");
}
async function imprimirVenda(venda: any) {
  const dataVenda = (venda.data || "").replace(",", "");
  const totalItens = venda.itens.reduce(
  (soma: number, item: any) => soma + Number(item.qtdVenda || 0),
  0
);

const texto =
  `${dataVenda}\n\n` +
  venda.itens
    .map(
      (item: any) =>
        `${item.nome}\nQtd: ${item.qtdVenda}\nR$ ${(item.preco * item.qtdVenda).toFixed(2)}`
    )
    .join("\n\n") +
`

-------------------------------
Itens: ${totalItens}
TOTAL: R$ ${Number(venda.total || 0).toFixed(2)}
-------------------------------

Obrigado pela preferencia!
`;

  await fetch("http://localhost:9876/imprimir", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texto,
    }),
  });
}
async function excluirVenda(venda: any) {
  if (!confirm("Deseja realmente excluir esta venda?")) return;

  for (const item of venda.itens || []) {
    const produtoAtual = produtos.find((p) => p.id === item.id);

    if (produtoAtual) {
      const novoEstoque = produtoAtual.estoque + item.qtdVenda;

      await updateDoc(doc(db, "produtos", item.id), {
        estoque: novoEstoque,
      });
    }
  }

  await deleteDoc(doc(db, "vendas", String(venda.id)));

  setProdutos(
    produtos.map((p) => {
      const item = venda.itens?.find((i: any) => i.id === p.id);
      return item ? { ...p, estoque: p.estoque + item.qtdVenda } : p;
    })
  );

  setVendas(vendas.filter((v) => v.id !== venda.id));

  alert("Venda excluída e estoque devolvido!");
}

  if (!logado) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-red-600">
          <h1 className="text-4xl font-bold text-red-600 text-center">CENTRAL</h1>
          <h2 className="text-2xl font-bold text-white text-center">CELL REPAIR</h2>
          <p className="text-zinc-400 text-center mt-2">Sistema de Estoque e Vendas</p>

          <div className="space-y-4 mt-8">
            <input
  className="w-full p-3 rounded-lg bg-zinc-800 text-white border border-zinc-700"
  placeholder="Usuário"
  value={usuario}
  onChange={(e) => setUsuario(e.target.value)}
/>

<input
  className="w-full p-3 rounded-lg bg-zinc-800 text-white border border-zinc-700"
  placeholder="Senha"
  type="password"
  value={senha}
  onChange={(e) => setSenha(e.target.value)}
/>
            <button
  onClick={async () => {
  const snap = await getDocs(collection(db, "usuarios"));

  const usuarioValido = snap.docs.find((d: any) => {
    const dados = d.data();
    return (
      dados.usuario === usuario &&
      dados.senha === senha &&
      dados.ativo === true
    );
  });

  if (!usuarioValido) {
    alert("Usuário ou senha inválidos");
    return;
  }

  localStorage.setItem("logado", "true");
  setLogado(true);
}}
  className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg text-white font-bold"
>
  ENTRAR
</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <button
  onClick={() => setMenuAberto(!menuAberto)}
  className="md:hidden fixed top-4 left-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
>
  ☰ Menu
</button>
      <aside className={`${menuAberto ? "block" : "hidden"} md:block w-full md:fixed md:left-0 md:top-0 md:h-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-red-600 p-5 pt-20 md:pt-5`}>
        <h1 className="text-2xl font-bold text-red-600">CENTRAL</h1>
        <h2 className="text-xl font-bold mb-8">CELL REPAIR</h2>

        {[
  "Dashboard",
  "Produtos",
  "PDV",
  "Vendas",
  "Relatórios",
  "Estoque Baixo"
].map((item) => (
          <button
            key={item}
            onClick={() => {
  setTela(item);
  setMenuAberto(false);
}}
            className={`block w-full text-left p-3 rounded-lg mb-2 ${
              tela === item ? "bg-red-600" : "hover:bg-zinc-800"
            }`}
          >
            {item}
          </button>
        ))}

        <button
  onClick={() => {
    localStorage.removeItem("logado");
    setLogado(false);
  }}
>
  Sair
</button>
      </aside>

      <main className="p-4 pt-20 md:pt-8 md:ml-64 md:p-8">
        {tela === "Dashboard" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              <Card titulo="Vendas Hoje" valor={`R$ ${vendasHoje.toFixed(2)}`} />
              <Card titulo="Lucro Hoje" valor={`R$ ${lucroHoje.toFixed(2)}`} />
              <Card titulo="Valor em Estoque" valor={`R$ ${valorEstoque.toFixed(2)}`} />
              <Card titulo="Total de Produtos" valor={`${produtos.length}`} />
              <Card titulo="Estoque Baixo" valor={`${estoqueBaixo}`} />
            </div>
          </>
        )}

        {tela === "Produtos" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Cadastro de Produtos e Acessórios</h1>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
  <input
    className="Input w-full"
    placeholder="Pesquisar produto por nome, categoria, cor ou código"
    value={busca}
    onChange={(e) => setBusca(e.target.value)}
  />
</div>

            <div className="grid grid-cols-3 gap-4 bg-zinc-900 p-5 rounded-xl border border-zinc-800 mb-6">
              <input className="Input" placeholder="Nome do produto" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              <select className="Input" value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}>
                {categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input className="Input" placeholder="Código de barras / SKU" value={novo.codigo} onChange={(e) => setNovo({ ...novo, codigo: e.target.value })} />
              <input className="Input" placeholder="Custo" value={novo.custo} onChange={(e) => setNovo({ ...novo, custo: e.target.value })} />
              <input className="Input" placeholder="Preço de venda" value={novo.preco} onChange={(e) => setNovo({ ...novo, preco: e.target.value })} />
              <input className="Input" placeholder="Quantidade" value={novo.estoque} onChange={(e) => setNovo({ ...novo, estoque: e.target.value })} />
              <select
  className="Input"
  value={novo.cor}
  onChange={(e) => setNovo({ ...novo, cor: e.target.value })}
>
  <option value="">Cor</option>
  <option value="Preto">Preto</option>
  <option value="Branco">Branco</option>
  <option value="Azul">Azul</option>
  <option value="Vermelho">Vermelho</option>
  <option value="Rosa">Rosa</option>
  <option value="Verde">Verde</option>
  <option value="Dourado">Dourado</option>
  <option value="Prata">Prata</option>
  <option value="Transparente">Transparente</option>
  <option value="Colorido">Colorido</option>
</select>
              <div className="col-span-full">
  <label className="block mb-2 font-semibold text-white">
    Foto do Produto
  </label>

  <input
    type="file"
    accept="image/*"
    onChange={selecionarFoto}
    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white"
  />

  {novo.foto && (
    <img
      src={novo.foto}
      alt="Prévia"
      className="mt-4 h-28 w-28 rounded-lg border border-red-600 object-cover"
    />
  )}
</div>
              <button onClick={cadastrarProduto} className="bg-red-600 rounded-lg font-bold">Cadastrar Produto</button>
            </div>

            <TabelaProdutos
  produtos={produtosFiltrados}
  setProdutos={setProdutos}
  editarProduto={editarProduto}
/>
          </>
        )}

        {tela === "PDV" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Nova Venda / PDV</h1>

            <input
              className="Input mb-5 w-full"
              placeholder="Buscar produto por nome, categoria ou código"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {produtosFiltrados.map((p) => (
                  <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between">
                    <div className="flex items-center gap-3">
  {p.foto && (
    <img
      src={p.foto}
      alt={p.nome}
      className="w-14 h-14 rounded-lg object-cover"
    />
  )}

  <div>
    <h3 className="font-bold">{p.nome}</h3>
    <p className="text-zinc-400">
      {p.categoria} • Cor: {p.cor || "-"}
    </p>
    <p className="text-zinc-500 text-sm">
  Cód: {p.codigo}
</p>
    <p className="text-zinc-400">
      Estoque: {p.estoque}
    </p>
    <p className="text-red-500 font-bold">
      R$ {p.preco.toFixed(2)}
    </p>
  </div>
</div>
                    <button onClick={() => adicionarCarrinho(p)} className="bg-red-600 px-4 rounded-lg font-bold">
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-900 border border-red-600 p-5 rounded-xl sticky bottom-4 md:top-8 md:bottom-auto">
                <h2 className="text-xl font-bold mb-4">Carrinho</h2>

                {carrinho.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-zinc-800 py-2">
  <div>
    <p>{item.nome} x{item.qtdVenda}</p>
    <button
      onClick={() => setCarrinho(carrinho.filter((p) => p.id !== item.id))}
      className="text-red-500 text-sm"
    >
      Remover
    </button>
  </div>

  <span>R$ {(item.preco * item.qtdVenda).toFixed(2)}</span>
</div>
))}

                <h2 className="text-2xl font-bold mt-6">
                  Total: R$ {carrinho.reduce((s, i) => s + i.preco * i.qtdVenda, 0).toFixed(2)}
                </h2>

                <button onClick={finalizarVenda} className="w-full bg-red-600 mt-5 p-3 rounded-lg font-bold">
                  Finalizar Venda
                </button>
              </div>
            </div>
          </>
        )}

        {tela === "Vendas" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Histórico de Vendas</h1>
            {[...vendas]
  .sort((a: any, b: any) => {
    const dataA = a.createdAt?.seconds
      ? a.createdAt.seconds * 1000
      : new Date(a.data).getTime();

    const dataB = b.createdAt?.seconds
      ? b.createdAt.seconds * 1000
      : new Date(b.data).getTime();

    return dataB - dataA;
  })
  .map((v) => (
  <div
    key={v.id}
    className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"
  >
    <div className="space-y-3">
      {v.itens?.map((item: any) => (
        <div key={item.id} className="flex items-center gap-3">
          {item.foto && (
            <img
              src={item.foto}
              alt={item.nome}
              className="w-14 h-14 rounded-lg object-cover"
            />
          )}

          <div>
            <p className="font-bold">{item.nome}</p>
            <p className="text-zinc-400 text-sm">
              Cor: {item.cor || "-"} • Qtd: {item.qtdVenda}
            </p>
            <p className="text-red-500 text-sm font-bold">
              R$ {(item.preco * item.qtdVenda).toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>

    <div className="md:text-right">
      <p className="text-zinc-400">{v.data}</p>
      <h2 className="text-xl font-bold">
        Total: R$ {Number(v.total || 0).toFixed(2)}
      </h2>
      <p className="text-red-500">
        Lucro: R$ {Number(v.lucro || 0).toFixed(2)}
      </p>
      <button
  onClick={() => imprimirVenda(v)}
  className="mt-3 mr-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white font-semibold"
>
  🖨️ Imprimir
</button>
      <button
  onClick={() => excluirVenda(v)}
  className="mt-3 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white font-semibold"
>
  Excluir Venda
</button>
    </div>
  </div>
))}
          </>
        )}
        {tela === "Relatórios" && (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold">
      Relatórios
    </h1>

    <div className="grid md:grid-cols-3 gap-4">
      <input
  type="date"
  value={dataInicial}
  onChange={(e) => setDataInicial(e.target.value)}
  className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white"
/>
<input
  type="date"
  value={dataFinal}
  onChange={(e) => setDataFinal(e.target.value)}
  className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white"
/>

      <div className="flex gap-2">
  <button
    onClick={() => {
      setDataBuscaInicial(dataInicial);
      setDataBuscaFinal(dataFinal);
    }}
    className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg p-3 font-bold"
  >
    🔍 Pesquisar
  </button>

  <button
    onClick={imprimirCupom}
    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-4 font-bold"
  >
    🖨️
  </button>

  <button
  onClick={gerarPDF}
  className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 font-bold"
>
  📄 PDF
</button>
</div>
    </div>
    <div className="grid md:grid-cols-4 gap-4 mt-6">
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
    <p className="text-zinc-400 text-sm">Total Vendido</p>
    <h2 className="text-2xl font-bold text-green-500">
      R$ {totalRelatorio.toFixed(2)}
    </h2>
  </div>

  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
    <p className="text-zinc-400 text-sm">Lucro</p>
    <h2 className="text-2xl font-bold text-red-500">
      R$ {lucroRelatorio.toFixed(2)}
    </h2>
  </div>

  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
    <p className="text-zinc-400 text-sm">Quantidade de Vendas</p>
    <h2 className="text-2xl font-bold">
      {quantidadeVendasRelatorio}
    </h2>
  </div>

  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
    <p className="text-zinc-400 text-sm">Produtos Vendidos</p>
    <h2 className="text-2xl font-bold">
      {quantidadeProdutosRelatorio}
    </h2>
  </div>
</div>
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
  {produtosVendidosRelatorio.map((item: any) => (
    <div
      key={item.id}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4"
    >
      {item.foto && (
        <img
          src={item.foto}
          alt={item.nome}
          className="w-24 h-24 rounded-lg object-cover"
        />
      )}

      <div className="flex-1">
        <h3 className="font-bold text-lg">
          {item.nome}
        </h3>

        <p className="text-zinc-400 text-sm">
          Categoria: {item.categoria}
        </p>

        <p className="text-zinc-400 text-sm">
          Cor: {item.cor}
        </p>

        <p className="text-zinc-400 text-sm">
          Código: {item.codigo}
        </p>

        <div className="mt-3 space-y-1">
          <p className="text-white">
            Quantidade: <b>{item.qtd}</b>
          </p>

          <p className="text-green-500 font-bold">
            Total: R$ {item.total.toFixed(2)}
          </p>

          <p className="text-red-500 font-bold">
            Lucro: R$ {item.lucro.toFixed(2)}
          </p>
          <button
  className="mt-3 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white"
  onClick={() => imprimirProduto(item)}
>
  🖨️ Imprimir
</button>
        </div>
      </div>
    </div>
  ))}
</div>
  </div>
)}

        {tela === "Estoque Baixo" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Produtos com Estoque Baixo</h1>
            <TabelaProdutos
  produtos={produtos.filter((p) => p.estoque <= 0)}
  setProdutos={setProdutos}
  editarProduto={editarProduto}
/>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-zinc-400">{titulo}</p>
      <h2 className="text-2xl font-bold text-red-500">{valor}</h2>
    </div>
  );
}

function TabelaProdutos({
  produtos,
  setProdutos,
  editarProduto,
}: {
  produtos: Produto[];
  setProdutos: React.Dispatch<React.SetStateAction<Produto[]>>;
  editarProduto: (produto: Produto) => void;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
      <table className="w-[950px] md:w-full">
        <thead className="bg-zinc-950 text-zinc-300">
          <tr>
            <th className="p-3 text-left">Produto</th>
            <th className="p-3 text-left">Categoria</th>
            <th className="p-3 text-left">Custo</th>
            <th className="p-3 text-left">Venda</th>
            <th className="p-3 text-left">Estoque</th>
            <th className="p-3 text-left">Cor</th>
            <th className="p-3 text-left">Código</th>
            <th className="p-3 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
            <tr
  key={p.id}
  className={`border-t border-zinc-800 ${
    p.estoque <= 0 ? "bg-red-950/50" : ""
  }`}
>
              <td className="p-3">
  <div className="flex items-center gap-3">
    {p.foto && (
      <img
        src={p.foto}
        alt={p.nome}
        className="w-12 h-12 rounded-lg object-cover"
      />
    )}
    <span>{p.nome}</span>
  </div>
</td>
              <td className="p-3">{p.categoria}</td>
              <td className="p-3">R$ {p.custo.toFixed(2)}</td>
              <td className="p-3 text-red-500 font-bold">R$ {p.preco.toFixed(2)}</td>
              <td className={`p-3 font-bold ${p.estoque <= 0 ? "text-red-500" : ""}`}>
  {p.estoque}
</td>
<td className="p-3">{p.cor || "-"}</td>
              <td className="p-3">{p.codigo}</td>
              <td className="p-3">
                <button
  onClick={() => editarProduto(p)}
  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white mr-2"
>
  Editar
</button>
  <button
    onClick={async () => {
  if (confirm("Deseja excluir este produto?")) {
    await deleteDoc(doc(db, "produtos", p.id));
    setProdutos(produtos.filter((item) => item.id !== p.id));
  }
}}
    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white"
  >
    Excluir
  </button>
</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

