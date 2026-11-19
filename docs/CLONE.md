# 克隆本仓库

公开仓库的默认分支 `main` 含应用源码和试点规格。

```bash
git clone https://github.com/18926119195/diergbanben-.git
cd diergbanben-
```

文档入口见 [规格与试点文档](./README.md)。关键文件包括

- `docs/内禀坐标与指向性推理控制-大模型厂商工程规格.md`
- `docuverse/REASONING_PILOT.md`

在 Node.js 24 中安装、启动和构建 Docuverse 试点。

```bash
cd docuverse
npm ci
npm run dev
```

运行 `npm run build` 生成 `dist/`。真实 OCR、向量检索和推理的配置字段见 [`.env.example`](../docuverse/.env.example)。未配置推理服务时可以查看应用内标注为 Mock 的结果。
