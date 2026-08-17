# 克隆本仓库

远程（已推送 `main` 与试点分支，含规格文档）：

```bash
git clone https://github.com/18926119195/hypertext-interact.git
cd hypertext-interact
```

需要登录有权限的 GitHub 账号（私库）。文档位置：

- `docs/内禀坐标与指向性推理控制-大模型厂商工程规格.md`
- `docuverse/REASONING_PILOT.md`

Docuverse 试点：

```bash
cd docuverse
cp .env.example .env.local   # 填入自己的 Key，勿提交
npm install
npm run dev
```
