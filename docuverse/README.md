# DOCUMVERSE — Ted Nelson 文档宇宙

应用参考两份专利探索 PDF 页面导航、连接和交错文档。

| 专利 | 角色 | 代码入口 |
|------|------|----------|
| US2012/0137202A1 System for Exploring Connections Between Data Pages | 前端 CVS | `src/cvs/*` `src/zigzag/edl.ts` |
| US2013/0174003A1 System for Combining Datasets by Intercalation | 专利阅读示例 | [`src/data/pdfUniverse.ts`](./src/data/pdfUniverse.ts)、[`../patent-ocr/glm-data-spec.md`](../patent-ocr/glm-data-spec.md) |

GLM-5V-Turbo 附图规格：`../patent-ocr/glm-frontend-spec.md`、`glm-data-spec.md`

## 运行

```bash
cd docuverse
npm ci
npm run dev
```

打开 http://127.0.0.1:5173/

## 专利导航键（CVS）

- `C` / `E` — 当前页下一条 / 上一条连接（swoop）
- `F` — 进入伴页（companion → current）
- `S` — 交换主页与伴页
- `↑↓` — sworf 缩放
- `←→` — 水平环视
- `H` — 打开或关闭强调笔
- `[` / `]` — 上一页 / 下一页
