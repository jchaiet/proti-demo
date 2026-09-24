export type SiteLocale = {
  code: string;
  label?: string;
};

export type Site = {
  _id: string;
  name: string;
  key: string;
  domains: string[];
  defaultLocale: string;
  locales: SiteLocale[];
};
