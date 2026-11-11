/** Listas para la configuración inicial: bancos, activos con precio automático y suscripciones típicas. */

export interface BankOption { name: string; color: string }

export const BANKS: BankOption[] = [
  { name: 'Santander', color: '#ec0000' },
  { name: 'BBVA', color: '#1464a5' },
  { name: 'CaixaBank', color: '#007eae' },
  { name: 'Sabadell', color: '#0099cc' },
  { name: 'ING', color: '#ff6200' },
  { name: 'Openbank', color: '#e30613' },
  { name: 'Bankinter', color: '#ff7300' },
  { name: 'Unicaja', color: '#00843d' },
  { name: 'Cajamar', color: '#16a34a' },
  { name: 'Kutxabank', color: '#c8102e' },
  { name: 'Abanca', color: '#009fe3' },
  { name: 'Revolut', color: '#71717a' },
  { name: 'N26', color: '#36a18b' },
  { name: 'Trade Republic', color: '#a1a1aa' },
  { name: 'MyInvestor', color: '#0ea5e9' },
  { name: 'Indexa Capital', color: '#2563eb' },
  { name: 'DEGIRO', color: '#0a7cff' },
  { name: 'Binance', color: '#f0b90b' },
  { name: 'Coinbase', color: '#0052ff' },
];

export type AssetKind = 'crypto' | 'fund' | 'stock';

export interface AssetOption {
  name: string;
  kind: AssetKind;
  coingeckoId: string | null; // cripto
  priceSymbol: string | null; // Yahoo, cotizando en EUR
  hint?: string;
}

const crypto = (name: string, coingeckoId: string, hint: string): AssetOption => ({ name, kind: 'crypto', coingeckoId, priceSymbol: null, hint });
const listed = (name: string, kind: 'fund' | 'stock', priceSymbol: string, hint?: string): AssetOption =>
  ({ name, kind, coingeckoId: null, priceSymbol, hint });

export const ASSET_GROUPS: { title: string; assets: AssetOption[] }[] = [
  {
    title: 'Fondos indexados y ETF',
    assets: [
      listed('iShares Core MSCI World', 'fund', 'EUNL.DE', 'ETF · mundo'),
      listed('Vanguard FTSE All-World', 'fund', 'VWCE.DE', 'ETF · mundo'),
      listed('iShares Core S&P 500', 'fund', 'SXR8.DE', 'ETF · EE. UU.'),
      listed('iShares Nasdaq 100', 'fund', 'SXRV.DE', 'ETF · tecnológicas'),
      listed('iShares MSCI Emerging Markets', 'fund', 'IS3N.DE', 'ETF · emergentes'),
      listed('Fidelity MSCI World', 'fund', '0P0001CLDK.F', 'Fondo indexado'),
    ],
  },
  {
    title: 'Criptomonedas',
    assets: [
      crypto('Bitcoin', 'bitcoin', 'BTC'),
      crypto('Ethereum', 'ethereum', 'ETH'),
      crypto('Solana', 'solana', 'SOL'),
      crypto('XRP', 'ripple', 'XRP'),
      crypto('Cardano', 'cardano', 'ADA'),
    ],
  },
  {
    title: 'Acciones',
    assets: [
      listed('Apple', 'stock', 'APC.DE'),
      listed('Microsoft', 'stock', 'MSF.DE'),
      listed('Alphabet (Google)', 'stock', 'ABEA.DE'),
      listed('Amazon', 'stock', 'AMZ.DE'),
      listed('NVIDIA', 'stock', 'NVD.DE'),
      listed('Tesla', 'stock', 'TL0.DE'),
      listed('Meta', 'stock', 'FB2A.DE'),
      listed('Santander', 'stock', 'SAN.MC'),
      listed('BBVA', 'stock', 'BBVA.MC'),
      listed('Iberdrola', 'stock', 'IBE.MC'),
      listed('Inditex', 'stock', 'ITX.MC'),
      listed('Telefónica', 'stock', 'TEF.MC'),
    ],
  },
];

export const assetId = (a: Pick<AssetOption, 'coingeckoId' | 'priceSymbol'>) => a.coingeckoId ? `cg:${a.coingeckoId}` : `yf:${a.priceSymbol}`;

export const SUBSCRIPTIONS: { name: string; amount: number }[] = [
  { name: 'Netflix', amount: 13.99 },
  { name: 'Spotify', amount: 11.99 },
  { name: 'Amazon Prime', amount: 4.99 },
  { name: 'Disney+', amount: 9.99 },
  { name: 'HBO Max', amount: 9.99 },
  { name: 'iCloud', amount: 2.99 },
  { name: 'YouTube Premium', amount: 13.99 },
  { name: 'ChatGPT Plus', amount: 23 },
  { name: 'Gimnasio', amount: 35 },
  { name: 'Móvil', amount: 15 },
];

/** Sufijos de Yahoo de bolsas que cotizan en euros: el buscador solo ofrece esos. */
export const EUR_SUFFIXES = ['.DE', '.F', '.MC', '.AS', '.PA', '.MI', '.BR', '.LS', '.VI', '.HE', '.MU', '.SG', '.BE', '.DU', '.HM', '.IR'];
