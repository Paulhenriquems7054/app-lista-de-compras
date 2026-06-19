import { Category } from './types';

export interface CategoryItems {
  categoria: Category;
  itens: string[];
}

export const CATEGORY_ITEMS: CategoryItems[] = [
  {
    categoria: Category.FRUTAS_E_VERDURAS,
    itens: [
      "Maçã", "Banana", "Laranja", "Mamão", "Abacaxi", "Melancia", "Uva", "Morango",
      "Pêra", "Manga", "Limão", "Tomate", "Cebola", "Alho", "Batata", "Cenoura",
      "Abobrinha", "Alface", "Couve", "Espinafre", "Pepino", "Pimentão", "Beterraba",
      "Chuchu", "Brócolis", "Couve-flor", "Acelga", "Rúcula", "Almeirão", "Vagem"
    ]
  },
  {
    categoria: Category.CARNES_E_FRIOS,
    itens: [
      "Frango (peito, coxa, asa)", "Carne bovina (patinho, alcatra, acém)",
      "Carne suína (lombo, pernil)", "Peixe (tilápia, sardinha, salmão)",
      "Linguiça", "Presunto", "Peito de peru", "Mortadela", "Bacon",
      "Salsicha", "Salame", "Hambúrguer congelado", "Nuggets"
    ]
  },
  {
    categoria: Category.LATICINIOS,
    itens: [
      "Leite", "Queijo mussarela", "Queijo prato", "Requeijão", "Manteiga",
      "Iogurte", "Creme de leite", "Leite condensado", "Ricota",
      "Queijo ralado", "Chantilly"
    ]
  },
  {
    categoria: Category.PADARIA,
    itens: [
      "Pão francês", "Pão de forma", "Pão integral", "Pão de queijo",
      "Bolo", "Croissant", "Torrada", "Bolacha salgada", "Bolacha doce"
    ]
  },
  {
    categoria: Category.MERCEARIA,
    itens: [
      "Arroz", "Feijão", "Macarrão", "Farinha de trigo", "Açúcar", "Sal",
      "Óleo", "Azeite", "Molho de tomate", "Milho enlatado", "Ervilha",
      "Atum", "Sardinha", "Café", "Chá", "Achocolatado", "Temperos prontos",
      "Vinagre", "Fermento", "Maionese", "Ketchup", "Mostarda"
    ]
  },
  {
    categoria: Category.LIMPEZA,
    itens: [
      "Sabão em pó", "Sabão em barra", "Amaciante", "Desinfetante",
      "Água sanitária", "Detergente", "Esponja", "Multiuso", "Álcool",
      "Panos de limpeza", "Vassoura", "Rodo", "Balde", "Sacos de lixo"
    ]
  },
  {
    categoria: Category.HIGIENE_PESSOAL,
    itens: [
      "Sabonete", "Shampoo", "Condicionador", "Creme dental",
      "Escova de dentes", "Fio dental", "Desodorante", "Papel higiênico",
      "Absorvente", "Cotonete", "Lenço umedecido", "Hidratante corporal",
      "Lâmina de barbear", "Perfume"
    ]
  },
  {
    categoria: Category.BEBIDAS,
    itens: [
      "Água mineral", "Refrigerante", "Suco natural", "Suco de caixinha",
      "Cerveja", "Vinho", "Leite vegetal", "Energético", "Chá gelado",
      "Água de coco"
    ]
  },
  {
    categoria: Category.OUTROS,
    itens: [
      "Ração para pets", "Pilhas", "Velas", "Guardanapos",
      "Pratos e copos descartáveis", "Palitos de dente", "Fósforos",
      "Gelo", "Isqueiro", "Sacolas reutilizáveis"
    ]
  }
];

/**
 * Retorna os itens sugeridos para uma categoria específica
 */
export const getItemsByCategory = (category: Category): string[] => {
  const found = CATEGORY_ITEMS.find(c => c.categoria === category);
  return found ? found.itens : [];
};

/**
 * Busca itens que correspondem ao texto de pesquisa
 */
export const searchItems = (query: string, category?: Category): string[] => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  let itemsToSearch = category 
    ? getItemsByCategory(category)
    : CATEGORY_ITEMS.flatMap(c => c.itens);

  return itemsToSearch.filter(item => 
    item.toLowerCase().includes(normalizedQuery)
  );
};

