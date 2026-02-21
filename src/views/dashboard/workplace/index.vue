<template>
  <div class="container">
    <BrandBanner
      title="欢迎来到站长引擎"
      thumb="https://lf-cdn-tos.bytescm.com/obj/static/toutiao/iaasng/cimages/1.0.0.81/ecs_overview/banner.svg"
      description="基于 Arco Design Vue 和 Laravel 11 的前后端一体化中台解决方案，助力快速打造高效业务平台。"
    />

    <a-typography-title :heading="5">使用指引</a-typography-title>
    <a-space direction="vertical" size="large">
      <Guide>
        <GuideItem step="01" title="创建站点">
          单击“创建站点”按钮，完成站点配置，支持 AI 快速批量创建。
          <template #content>
            <a-button size="small" type="primary">立即创建</a-button>
          </template>
        </GuideItem>
        <GuideItem step="02" title="登录云服务器">
          一键全站生成静态页面，支持上传至 OSS，提升站点性能。
          <template #content>
            <a-link href="link">了解详情</a-link>
          </template>
        </GuideItem>
        <GuideItem step="03" title="搭建业务">
          快速部署前后端业务，助力您的项目高效上线。
          <template #content>
            <a-link href="link">最佳实践</a-link>
          </template>
        </GuideItem>
      </Guide>
      <a-row :gutter="16">
        <a-col :span="16">
          <a-typography-title :heading="5">产品优势</a-typography-title>
          <ProductAdvance :items="products" />
        </a-col>
        <a-col :span="8">
          <a-typography-title :heading="5">常见问题</a-typography-title>
          <div class="question">
            <a v-for="(row, index) in questions" :key="index" :href="row.link" target="_blank">
              {{ row.title }}
            </a>
          </div>
        </a-col>
      </a-row>
    </a-space>
  </div>
</template>

<script lang="ts" setup>
  import BrandBanner from '@/components/brand-banner/index.vue';
  import Guide from './components/guide.vue';
  import GuideItem from './components/guide-item.vue';
  import ProductAdvance from './components/product-advance.vue';

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

  const questions = [
    {
      title: '如何查看某个地域或可用区是否能购买实例？',
      link: 'https://www.aliyun.com/help/faq-detail/123456',
    },
    {
      title: '购买云服务器完成后是否可以切换地域？',
      link: 'https://www.aliyun.com/help/faq-detail/123457',
    },
    {
      title: '如何选择地域？',
      link: 'https://www.aliyun.com/help/faq-detail/123458',
    },
    {
      title: '如何选择可用区？',
      link: 'https://www.aliyun.com/help/faq-detail/123459',
    },
    {
      title: '如何选择适合我业务的ECS实例？',
      link: 'https://www.aliyun.com/help/faq-detail/123460',
    },
    {
      title: '购买云服务器ECS，如何选择实例类型？',
      link: 'https://www.aliyun.com/help/faq-detail/123461',
    },
    {
      title: '登录实例需要放通什么端口？',
      link: 'https://www.aliyun.com/help/faq-detail/123462',
    },
    {
      title: '哪些实例规格不支持变更？',
      link: 'https://www.aliyun.com/help/faq-detail/123463',
    },
    {
      title: '包年包月实例支持删除操作吗？',
      link: 'https://www.aliyun.com/help/faq-detail/123464',
    },
  ];
</script>

<script lang="ts">
  export default {
    name: 'Dashboard', // If you want the include property of keep-alive to take effect, you must name the component
  };
</script>

<style lang="less" scoped>
  .container {
    min-width: 1000px;
    max-width: 1240px;
    margin: 0 auto;
    padding: 32px;
  }

  .question {
    a {
      display: block;
      margin-bottom: 8px;
      padding: 0;
      color: var(--color-text-2);
      font-size: 13px;
      line-height: 22px;
      text-decoration: none;
      background-color: transparent;
      border-radius: var(--border-radius-small);
      transition: all 0.1s linear;
    }
  }
</style>
