/** Extract theme styles from web page URLs. */

import axios from "axios";
import * as cheerio from "cheerio";
import { parse, walk, generate } from "css-tree";
import type { Extractor } from "./base.js";
import {
  type ThemeStyle,
  makeThemeStyle,
  type ColorPalette,
} from "../models.js";
import { normalizeThemeStyle } from "../color-utils.js";

export class UrlExtractor implements Extractor {
  canHandle(source: string): boolean {
    return /^https?:\/\//i.test(source);
  }

  async extract(source: string): Promise<ThemeStyle> {
    const response = await axios.get(source, {
      headers: { "User-Agent": "ColaMD-Themes/0.1" },
      timeout: 15000,
    });

    const contentType = String(response.headers["content-type"] || "");
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`URL returned non-HTML content (${contentType}). Use the appropriate command for this file type.`);
    }

    const html = typeof response.data === "string" ? response.data : String(response.data);
    const $ = cheerio.load(html);
    const theme = makeThemeStyle(this.detectName($, source), "url", source);

    const styleCss = this.extractAllStyles($, source);
    this.populateFromStyles(theme.palette, styleCss, $);
    normalizeThemeStyle(theme);

    return theme;
  }

  private detectName($: cheerio.CheerioAPI, url: string): string {
    const title = $("title").text().trim();
    if (title) {
      return title.replace(/\s+/g, "-").replace(/[|:/\\.]/g, "-").replace(/-+/g, "-").slice(0, 60);
    }
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "extracted-theme";
    }
  }

  private extractAllStyles($: cheerio.CheerioAPI, baseUrl: string): string {
    const parts: string[] = [];

    // Combine all <style> blocks
    $("style").each((_, el) => {
      const text = $(el).text();
      if (text) parts.push(text);
    });

    return parts.join("\n");
  }

  private populateFromStyles(
    palette: ColorPalette,
    styleCss: string,
    $: cheerio.CheerioAPI
  ): void {
    const rules = this.parseCssRules(styleCss);

    // Extract body/root styles
    const bodyRule = this.findRule(rules, ["body", "html", ":root"]);
    if (bodyRule) {
      const bg = this.getProp(bodyRule, "background-color") || this.getProp(bodyRule, "background");
      if (bg) palette.bgColor = bg;
      const text = this.getProp(bodyRule, "color");
      if (text) palette.textColor = text;
    }

    // Extract heading styles
    const h1Rule = this.findRule(rules, ["h1"]);
    if (h1Rule) {
      const color = this.getProp(h1Rule, "color");
      if (color) palette.headingColor = color;
    }

    // Extract link styles
    const aRule = this.findRule(rules, ["a"]);
    if (aRule) {
      const color = this.getProp(aRule, "color");
      if (color) palette.accentColor = color;
    }

    // Extract code styles
    const codeRule = this.findRule(rules, ["code", "pre"]);
    if (codeRule) {
      const bg = this.getProp(codeRule, "background-color") || this.getProp(codeRule, "background");
      if (bg && bg !== "transparent") palette.codeBg = bg;
    }

    // Extract blockquote styles
    const bqRule = this.findRule(rules, ["blockquote"]);
    if (bqRule) {
      const border = this.getProp(bqRule, "border-left-color") || this.getProp(bqRule, "border-color");
      if (border) palette.blockquoteBorder = border;
      const bg = this.getProp(bqRule, "background-color") || this.getProp(bqRule, "background");
      if (bg) palette.blockquoteBg = bg;
    }

    // Also attempt to get computed body style from inline style or <body> tag
    const bodyTag = $("body");
    const bodyBg = bodyTag.css("background-color") || bodyTag.attr("bgcolor");
    if (bodyBg) palette.bgColor = bodyBg;
  }

  private parseCssRules(css: string): Map<string, Map<string, string>> {
    const result = new Map<string, Map<string, string>>();
    try {
      const ast = parse(css, { parseAtrulePrelude: false, parseRulePrelude: false });
      walk(ast, {
        visit: "Rule",
        enter(node) {
          const prelude = generate(node.prelude);
          const props = new Map<string, string>();
          walk(node.block, {
            visit: "Declaration",
            enter(decl) {
              props.set(decl.property, generate(decl.value));
            },
          });
          result.set(prelude, props);
        },
      });
    } catch {
      // CSS parse errors are non-fatal; extract what we can
    }
    return result;
  }

  private findRule(
    rules: Map<string, Map<string, string>>,
    selectors: string[]
  ): Map<string, string> | undefined {
    for (const sel of selectors) {
      for (const [key, props] of rules) {
        if (key.includes(sel)) return props;
      }
    }
    return undefined;
  }

  private getProp(props: Map<string, string>, prop: string): string | undefined {
    return props.get(prop);
  }
}
