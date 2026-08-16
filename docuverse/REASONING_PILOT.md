# 推理驾驭层（Reasoning Pilot）

依据 `内禀坐标与指向性推理控制-大模型厂商工程规格.md` **V3.1**。

**硬约束：** 圈定墨迹只是 `page_norm` 指针。进模型的是 A1 `key*` 上的机器读值（一锁两脸）。

**两面一体：** 有页图时文字原子强制挂图脸；版面 figure 与文字 IoU 重叠则合并同一 `key*`，禁止字/图双闭包。

**A1 时机：** 上传/解析/OCR 即建表（含 `V_book`），不依赖是否圈过。合成 run 键只在 B 侧当次解绑，**不回写 A 表**。

**模型部署：** Pilot 面板「模型部署」两槽——**审计 Embedding**（寻址）与 **推理 Chat**（留房）。保存进 localStorage；「重算 V_book」把审计向量写到 A1 原子。

## 建表分流

```text
OCR blocks → 按 label 分文字 / figure
  → 重叠则合并两面一体；孤儿 figure → layout_fig（真 bbox）
PDF textChunks → 文字原子 + 页图图脸
有 imageUrl 且无字 → 全页图原子（弱路径，不再用假段落框）
无图无块 → 段落假框兜底（最弱）
```

## 解绑入口

| 入口 | 行为 |
|------|------|
| H 笔圈定 | 本页原子求交 → run 候选 → 精确 `key*` |
| `V_q` 锚定 | 提问 probe × 原子 `V_book` → Top-K → 用户确认 |

## 验收用例（回归清单）

改 A1 / 解绑后按条点验：

1. **无 OCR 扫描页**：导入后 A1 仅图原子 >0；圈本页任意处 → 进房 `…|fig|p?:full`；不得无锁调模型。
2. **有文字 PDF**：圈一段字 → 文字主锁；审计区同时见【文字脸】+【图脸】（有页图时）。
3. **OCR 含 figure label**：figure 与字块重叠 → 原子统计「两面一体」增加，不另开第二个房；不重叠 → 独立 `layout_fig` 真 bbox，小圈可命中。
4. **跨相邻两块**：一圈命中相邻 → 合成一段 key*（仅当次）；A1 原子数不因圈选增加。
5. **灰度多候选**：一圈命中不相邻多簇 → 候选列表点选。
6. **跨页不串**：第 1 页圈 → 绝不锁到第 7 页。
7. **V_q 锚定**：不圈，输入问题点「V_q 锚定」→ Top-K，确认后可留房推理。
8. **持久化**：建表后 localStorage 有 `docuverse.a1.v1:*`；面板显示原子数。

## 真模型

复制 `.env.example` 为 `.env.local`，填 OpenAI 兼容端点。

## 代码位置

- `pipelineA.ts` — 建表 / 圈定 / `V_q` / IoU 合并
- `bookIndexStore.ts` — A1 旁路持久化
- `types.ts` — `faces` + `FigFace.imageRef`
- `ReasoningPilotPanel.tsx` — 索引统计、V_q UI、审计
