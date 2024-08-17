import request from '@/utils/request.js'

// 查询岗位列表
export function listPost(data) {
  return request({
    url: '/stock/history/page',
    method: 'post',
    data: data
  })
}

export function refreshStockInfoList() {
  return request({
    url: '/stock/history/refreshStockInfo',
    method: 'post',
  })
}

// 查询岗位详细
export function getPost(postId) {
  return request({
    url: '/system/post/' + postId,
    method: 'get'
  })
}

// 新增岗位
export function addPost(data) {
  return request({
    url: '/system/post',
    method: 'post',
    data: data
  })
}

// 修改岗位
export function updatePost(data) {
  return request({
    url: '/system/post',
    method: 'put',
    data: data
  })
}

export function reflash(data) {
  return request({
    url: '/system/post',
    method: 'post',
    data: data
  })
}