<template>
  <div class="container">
    <BrandBanner
      title="欢迎来到站长引擎"
      thumb="https://lf-cdn-tos.bytescm.com/obj/static/toutiao/iaasng/cimages/1.0.0.81/ecs_overview/banner.svg"
      description="基于 Arco Design Vue 和 Laravel 11 的前后端一体化中台解决方案，助力快速打造高效业务平台。"
    />

    <a-typography-title :heading="5">{{ $t('workplace.quick.operation') }}</a-typography-title>
    <a-space direction="vertical" size="large">
      <Guide>
        <GuideItem step="01" :title="$t('menu.user.info')">
          <template #content
            ><router-link :to="{ name: 'UserInfo' }">{{ $t('workplace.quickOperation.setup') }}</router-link></template
          >
        </GuideItem>
        <GuideItem v-if="hasPermission('system.member.view')" step="02" :title="$t('menu.system.member')">
          <template #content
            ><router-link :to="{ name: 'SystemMember' }">{{ $t('workplace.quickOperation.setup') }}</router-link></template
          >
        </GuideItem>
        <GuideItem
          v-if="hasPermission('system.file.view')"
          :step="hasPermission('system.member.view') ? '03' : '02'"
          :title="$t('menu.system.files')"
        >
          <template #content
            ><router-link :to="{ name: 'SystemFiles' }">{{ $t('workplace.quickOperation.setup') }}</router-link></template
          >
        </GuideItem>
      </Guide>
      <a-typography-title :heading="5">产品优势</a-typography-title>
      <ProductAdvance :items="products" />
    </a-space>
  </div>
</template>

<script lang="ts" setup>
  import usePermission from '@/hooks/permission';
  import BrandBanner from '@/components/brand-banner/index.vue';
  import Guide from './components/guide.vue';
  import GuideItem from './components/guide-item.vue';
  import ProductAdvance from './components/product-advance.vue';

  defineOptions({ name: 'Dashboard' });

  const { hasPermission } = usePermission();

  const products = [
    {
      title: '性能优越',
      description:
        '依托高效的前后端一体化架构，极大提升页面加载速度和数据处理能力，无论是高并发场景还是复杂业务逻辑，都能确保卓越的性能表现，保障用户流畅体验。',
    },
    {
      title: '弹性灵活',
      description: '支持灵活配置与功能扩展，能够轻松适应业务规模变化，实现从小型项目到大型应用的无缝升级。',
    },
    {
      title: '稳定可用',
      description: '全站一键生成静态页面，确保网站即使在高流量或突发情况下依然快速稳定运行，提升系统的容错性和响应速度。',
    },
    {
      title: '安全可靠',
      description:
        '通过高可用架构和冗余设计，保障系统在高峰期和突发情况下依旧保持稳定运行，避免业务中断。同时，自动化监控和故障修复机制确保全天候的服务可用性。',
    },
  ];
</script>

<style lang="less" scoped>
  .container {
    min-width: 1000px;
    max-width: 1240px;
    padding: 32px;
    margin: 0 auto;
  }
</style>
