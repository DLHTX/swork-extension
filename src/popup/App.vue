<template>
  <div>
    <div class="header">
      <div class="swork-title">
        Swork Extensions
        <div class="dflex ml20">
          <span :class="isConnect ? 'dot-green' : 'dot'"></span>
          <span class="ml5">{{ !isConnect ? "Disconnect" : "Connected" }}</span>
          <span v-if="user.user" class="ml10">[{{ user.user.name }}]</span>
        </div>
      </div>
    </div>

    <div class="content">
      <div
        class="connect-btn dflex swork-parimary-btn"
        @click="goSwork"
        v-if="!isConnect"
      >
        {{ sworkBtnText }}
      </div>
      <div class="p20" v-else>
        <!-- Token: ***{{ user.user.api_token.substring(0,4) }} -->
        <Form :model="form" label-position="top">
          <FormItem label="Project/Module/Page">
            <div class="dflex">
              <Select v-model="form.curProjectId" @on-change="getMoudle">
                <Option
                  v-for="(item, index) in projectList"
                  :key="index"
                  :value="item.project._id"
                  >{{ item.project.name }}</Option
                >
              </Select>
              <Select
                class="ml5"
                v-model="form.curModuleId"
                @on-change="getPages"
              >
                <Option
                  v-for="(item, index) in moduleList"
                  :key="index"
                  :value="item._id"
                  >{{ item.name }}</Option
                >
              </Select>
              <Select class="ml5" v-model="form.curPageId">
                <Option
                  v-for="(item, index) in pageList"
                  :key="index"
                  :value="item._id"
                  >{{ item.name }}</Option
                >
              </Select>
            </div>
          </FormItem>

          <FormItem label="Dealer">
            <Select v-model="form.dealer_id">
              <Option
                v-for="(item, index) in developerList"
                :key="index"
                :value="item.developer._id"
                >{{ item.developer.name }}</Option
              >
            </Select>
          </FormItem>

          <FormItem label="Type">
            <RadioGroup v-model="form.type">
              <Radio label="Bug"></Radio>
              <Radio label="Task"></Radio>
            </RadioGroup>
          </FormItem>
          <FormItem label="Title">
            <Input v-model="form.title"></Input>
          </FormItem>
          <FormItem label="Desction">
            <Input v-model="form.desc" type="textarea"></Input>
          </FormItem>
        </Form>
        <Button class="mt10" type="primary" @click="createIssue"
          >New Bug</Button
        >
      </div>
    </div>
  </div>
</template>

<script>
//https://www.cnblogs.com/chear/articles/4964945.html
const url = "https://testwork.growingsale.cn/";
import ViewUI from "view-design";
import "view-design/dist/styles/iview.css";
import Vue from "vue";
Vue.use(ViewUI);
import axios from "axios";

export default {
  name: "App",
  mounted() {
    this.getCurTab();
    this.setLocalstorageUser();
  },
  data() {
    return {
      user: null,
      isConnect: false,
      needFresh: false,
      sworkBtnText: "Connect Swrok",
      projectList: [],
      moduleList: [],
      pageList: [],
      developerList: [],
      form: {
        dealer_id: null,
        desc: null,
        title: null,
        type: "Bug",
        curProjectId: null,
        curModuleId: null,
        curPageId: null,
      },
    };
  },
  methods: {
    setLocalstorageUser() {
      chrome.storage.sync.get(["user"], (res) => {
        if (res.user) {
          this.isConnect = true;
          this.user = res;
          this.getProjects();
        }
      });
    },
    getProjects() {
      this.$api("getProjects").then((res) => {
        this.projectList = res;
        this.form.curProjectId = this.projectList[0].project._id;
        this.getMoudle();
        this.getDevelopersUnderProject();
        this.$forceUpdate();
      });
    },
    getDevelopersUnderProject() {
      this.$api(`getDevelopersUnderProject/${this.form.curProjectId}`).then(
        (res) => {
          this.developerList = res;
          this.form.dealer_id = this.developerList[0].developer._id;
        }
      );
    },
    getMoudle() {
      this.$api(`getProjectModules/${this.form.curProjectId}`).then((res) => {
        this.moduleList = res;
        this.form.curModuleId = this.moduleList[0]._id;
        this.getPages();
      });
    },
    getPages() {
      this.moduleList.forEach((item, index) => {
        if (item._id == this.form.curModuleId) {
          this.pageList = item.pages;
          this.form.curPageId =
            this.pageList && this.projectList.length > 0
              ? this.pageList[0]._id
              : null;
          this.$forceUpdate();
        }
      });
    },
    createIssue() {
      this.$api(`createIssue/${this.form.curProjectId}`, {
        title: this.form.title,
        status: "OPEN",
        module_id: this.form.curModuleId,
        page_id: this.form.curProjectId || "",
        type: this.form.type.toLowerCase(),
        grade: "1",
        desc: this.form.desc,
        dealer_id: this.form.dealer_id,
      }).then((res) => {
        this.$Message.success("Create Success");
      });
    },
    goSwork() {
      if (this.needFresh) {
        this.getCurTab();
        this.needFresh = false;
      } else {
        chrome.tabs.create({ url }, (res) => {
          this.getCurTab();
        });
      }
    },
    getCurTab() {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0].url.indexOf("https://testwork.growingsale.cn") > -1) {
          this.getLocalstorage(tabs[0].id);
        }
      });
    },
    async getLocalstorage(tabId) {
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabId,
          { message: "getLocalstorage" },
          (response) => {
            if (response) {
              chrome.storage.sync.set({ user: JSON.parse(response) });
              this.isConnect = true;
            } else {
              chrome.storage.sync.set({ user: JSON.parse(response) });
              this.isConnect = false;
              this.needFresh = true;
              this.sworkBtnText = "You need login to swork";
            }
          }
        );
      });
    },
    $api(url, data) {
      return new Promise((resolve, reject) => {
        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.user.user.api_token}`,
        };
        axios
          .post(`https://worker.growingsale.cn/management/v1/${url}`, data, {
            headers,
          })
          .then((response) => {
            resolve(response.data);
          })
          .catch((err) => {
            if (error.response.status == 401) {
              this.isConnect = false;
              this.$forceUpdate();
              this.$Message.warning("Token expired");
            }
          });
      });
    },
    // chrome.storage.onChanged.addListener(function (changes, areaName) {
    //   console.log("New item in storage", changes.visitedPages.newValue);
    // });
  },
};
</script>

<style>
@import url("../css/common.css");
.ivu-form-item {
  margin-bottom: 10px;
  vertical-align: top;
  zoom: 1;
}
.ivu-form-item-label {
  color: #038c81 !important;
}
.ivu-btn-primary {
  background-color: #038c81 !important;
}
.ivu-btn-primary:hover {
  background-color: #02a597 !important;
}
.ivu-radio-inner:after {
  background-color: #038c81;
}
.ivu-radio-checked .ivu-radio-inner {
  border-color: #038c81;
}
body {
  width: 400px;
  border: none;
  border-radius: 2px;
  padding: 0;
  margin: 0;
  height: fit-content;
}

.header {
  background-color: rgb(235, 235, 235);
  height: fit-content;
  padding: 10px;
  border-bottom: 1px solid rgb(216, 216, 216);
}

.swork-title {
  font-size: 13px;
  font-weight: 500;
  color: rgb(54, 54, 54);
  display: flex;
  align-items: center;
}

.dot {
  display: block;
  height: 7px;
  width: 7px;
  background-color: gray;
  border-radius: 50%;
  transform: translateY(2px);
}
.dot-green {
  display: block;
  height: 7px;
  width: 7px;
  background-color: green;
  border-radius: 50%;
  transform: translateY(2px);
}

.swork-parimary-btn {
  height: 30px;
  width: 100%;
  border-radius: 4px;
  background-color: #00ab9d;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.swork-parimary-btn:hover {
  transition: all 0.3s;
  background-color: #01c4b3;
}

.connect-btn {
  height: 30px;
  width: 80%;
  margin: 20px auto;
  border-radius: 4px;
  background-color: #00ab9d;
  color: white;
  cursor: pointer;
}
</style>
