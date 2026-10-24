# 后台布局约定

## Header 与侧栏

桌面侧栏模式下，Header 品牌区与侧栏使用同一个宽度值。品牌区右侧的 1px 分隔线使用 `--color-border`，与侧栏右边界衔接；侧栏折叠为 48px 时隐藏系统名称并居中显示 Logo。移动端抽屉、顶部菜单和隐藏侧栏模式不显示该分隔线。

侧栏模式的面包屑放在 Header 中，页签栏位于 Header 下方。顶部菜单或隐藏 Header 时，面包屑放在内容区顶部的独立导航条中。移动端只显示当前页名称。页面卡片不重复导航标题，字典类型和字典项等业务分区保留各自标题。

## 筛选与数据卡片

除下述工具栏布局页面外，有筛选条件的普通列表按顺序放置两块同级卡片：

1. 筛选卡片：搜索、筛选条件，以及页面已有的查询、重置操作。
2. 数据卡片：新增、批量操作、刷新、表格、分页。

使用现有 Arco 控件和 `Grid`。独立筛选区放在 `.filter-card` 中，不再用共同外层卡片包住两块卡片。会员、权限和字典页面将简短筛选控件放在 `GridToolbar` 的 `extra` 插槽中，与刷新操作同组；窄屏下允许换行，保持控件可用。没有筛选条件的页面仅保留数据卡片。文件管理沿用专用工具栏。

页面使用 `.page-container`，页面内边距和卡片间距沿用 `p-4` / `gap-4`（1rem，当前根字号下为 14px）；筛选卡片内边距为 20px、圆角为 4px，背景使用 `--color-bg-2`。无标题的 `Grid` 仍保持完整顶部内边距。字典双栏各自使用带工具栏筛选的 `Grid`；日志 Tab 内分别组织筛选和数据卡片，不套外层 `Grid`。

```vue
<template>
  <div class="page-container">
    <div class="filter-card">
      <!-- 沿用页面的筛选控件与查询事件 -->
    </div>
    <Grid>
      <GridToolbar @refresh="fetchData">
        <template #prepend><!-- 新增、批量操作 --></template>
      </GridToolbar>
      <GridTable :data="tableData" :columns="columns" />
    </Grid>
  </div>
</template>
```

这些约定只改变展示位置；筛选字段、提交时机、分页、接口和权限遵循各页面原有实现。
