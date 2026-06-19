// ─────────────────────────────────────────────────────────────────────────────
// voiceProductCatalog.ts
// Dicionário interno: produto → categoria automática
// Zero IA — lookup por normalização de texto
// ─────────────────────────────────────────────────────────────────────────────

import { Category } from '../types';

// ─── Catálogo: categoria → lista de produtos ──────────────────────────────────

const CATALOG: Record<Category, string[]> = {
  [Category.MERCEARIA]: [
    'açúcar', 'acucar', 'arroz', 'feijão', 'feijao', 'café', 'cafe',
    'macarrão', 'macarrao', 'óleo', 'oleo', 'farinha', 'sal', 'vinagre',
    'molho', 'extrato', 'tomate pelado', 'atum', 'sardinha', 'milho',
    'ervilha', 'milho verde', 'fubá', 'fuba', 'amido', 'maisena',
    'fermento', 'bicarbonato', 'tempero', 'colorau', 'pimenta', 'orégano',
    'oregano', 'canela', 'cravo', 'louro', 'noz moscada', 'alho',
    'cebola em pó', 'cebola em po', 'catchup', 'maionese', 'mostarda',
    'azeite', 'manteiga de amendoim', 'mel', 'geleia', 'gelatina',
    'achocolatado', 'nescau', 'ovomaltine', 'milo',
  ],
  [Category.LATICINIOS]: [
    'leite', 'queijo', 'manteiga', 'requeijão', 'requeijao', 'iogurte',
    'cream cheese', 'ricota', 'mussarela', 'mozzarela', 'parmesão',
    'parmesao', 'creme de leite', 'leite condensado', 'leite em pó',
    'leite em po', 'nata', 'coalhada',
  ],
  [Category.PADARIA]: [
    'pão', 'pao', 'pão francês', 'pao frances', 'pão de forma', 'pao de forma',
    'bolo', 'torrada', 'bisnaguinha', 'bisnaga', 'croissant', 'sonho',
    'coxinha', 'esfiha', 'pão integral', 'pao integral', 'pão de queijo',
    'pao de queijo', 'broa',
  ],
  [Category.CARNES_E_FRIOS]: [
    'carne', 'frango', 'linguiça', 'linguica', 'presunto', 'mortadela',
    'salsicha', 'bacon', 'peito de frango', 'coxa de frango', 'sobrecoxa',
    'alcatra', 'patinho', 'acém', 'acem', 'costela', 'picanha', 'contrafilé',
    'contrafila', 'file mignon', 'filé mignon', 'fígado', 'figado',
    'moela', 'coração', 'coracao', 'peixe', 'salmão', 'salmao', 'tilápia',
    'tilapia', 'atum fresco', 'camarão', 'camarao', 'apresuntado',
    'blanquet', 'peito de peru',
  ],
  [Category.FRUTAS_E_VERDURAS]: [
    'banana', 'maçã', 'maca', 'tomate', 'cebola', 'alface', 'cenoura',
    'batata', 'batata doce', 'mandioca', 'aipim', 'macaxeira', 'abóbora',
    'abobora', 'chuchu', 'pepino', 'pimentão', 'pimentao', 'abobrinha',
    'brócolis', 'brocolis', 'couve-flor', 'couveflor', 'repolho', 'couve',
    'espinafre', 'rúcula', 'rucula', 'agrião', 'agriao', 'salsinha',
    'cheiro-verde', 'cebolinha', 'limão', 'limao', 'laranja', 'uva',
    'mamão', 'mamao', 'melão', 'melao', 'melancia', 'abacaxi', 'manga',
    'pera', 'morango', 'kiwi', 'abacate', 'goiaba', 'caju', 'acerola',
    'maracujá', 'maracuja', 'framboesa', 'mirtilo', 'ameixa',
  ],
  [Category.LIMPEZA]: [
    'detergente', 'sabão', 'sabao', 'sabão em pó', 'sabao em po',
    'água sanitária', 'agua sanitaria', 'desinfetante', 'multiuso',
    'limpa forno', 'limpa vidro', 'limpa pedra', 'limpador', 'esponja',
    'palha de aço', 'palha de aco', 'flanela', 'pano de prato', 'vassoura',
    'rodo', 'mop', 'balde', 'luva', 'luva de borracha', 'saco de lixo',
    'papel toalha', 'pano de chão', 'cloro', 'hipoclorito', 'amaciante',
    'alvejante',
  ],
  [Category.HIGIENE_PESSOAL]: [
    'sabonete', 'shampoo', 'xampu', 'condicionador', 'creme dental',
    'pasta de dente', 'pasta dental', 'escova de dente', 'fio dental',
    'desodorante', 'antitranspirante', 'absorvente', 'fralda', 'lenço',
    'papel higiênico', 'papel higienico', 'hidratante', 'creme',
    'protetor solar', 'repelente', 'algodão', 'algodao', 'cotonete',
    'band-aid', 'curativo', 'álcool gel', 'alcool gel', 'álcool', 'alcool',
    'termômetro', 'termometro', 'lâmina', 'lamina', 'gilete',
  ],
  [Category.BEBIDAS]: [
    'refrigerante', 'suco', 'água', 'agua', 'energético', 'energetico',
    'cerveja', 'vinho', 'cachaça', 'cachaca', 'vodka', 'whisky',
    'aguardente', 'isotônico', 'isotonico', 'chá', 'cha', 'café solúvel',
    'cafe solavel', 'leite de coco', 'caldo de cana', 'limonada',
    'kombucha', 'kefir bebível', 'kefir bebivel',
  ],
  [Category.OUTROS]: [],
};

// ─── Índice invertido: produto_normalizado → categoria ────────────────────────
// Construído uma única vez na carga do módulo (O(n) na inicialização)

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const INDEX = new Map<string, Category>();

for (const [cat, products] of Object.entries(CATALOG) as [Category, string[]][]) {
  for (const product of products) {
    INDEX.set(normalize(product), cat as Category);
  }
}

/**
 * Retorna a categoria de um produto pelo nome.
 * Estratégia: exato → prefixo → fallback OUTROS
 */
export function categorizeProduct(productName: string): Category {
  const key = normalize(productName);

  // 1. Match exato
  if (INDEX.has(key)) return INDEX.get(key)!;

  // 2. Produto contém alguma palavra do catálogo (ex: "leite integral" → Laticínios)
  for (const [catalogKey, cat] of INDEX.entries()) {
    if (key.includes(catalogKey) || catalogKey.includes(key)) {
      return cat;
    }
  }

  return Category.OUTROS;
}

/** Exporta o catálogo completo para uso externo (ex: sugestões) */
export function getAllProductNames(): string[] {
  const names: string[] = [];
  for (const products of Object.values(CATALOG)) {
    names.push(...products);
  }
  return names;
}
