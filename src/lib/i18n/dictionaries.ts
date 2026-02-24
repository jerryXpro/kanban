export type Locale = 'zh-TW' | 'en' | 'vi'

export const dictionaries = {
    'zh-TW': {
        board: {
            add_list: '+ 新增列表',
            add_card: '+ 新增卡片',
            enter_list_title: '輸入列表名稱...',
            enter_card_title: '輸入卡片標題...',
            description_optional: '描述 (選填)',
            add: '新增',
            save: '儲存',
            cancel: '取消',
            edit_card: '編輯卡片',
            delete_card: '刪除卡片',
            rename_list: '重新命名列表',
            delete_list: '刪除列表',
            delete_card_confirm: '確定要刪除這張卡片嗎？',
            delete_list_confirm: '確定要刪除這個列表嗎？裡面的所有卡片都會被永久刪除。',
            add_list_failed: '新增列表失敗。',
            add_card_failed: '新增卡片失敗。',
            permission_denied_list: '權限不足：只有主管職級可以移動列表順序。',
            global_announcement: '重要公告',
        },
        header: {
            sign_out: '登出',
            upgrade_manager: '升級為課長(測試)',
            loading: '載入中...',
            error: '發生錯誤',
            back_to_departments: '回首頁'
        }
    },
    'en': {
        board: {
            add_list: '+ Add another list',
            add_card: '+ Add a card',
            enter_list_title: 'Enter list title...',
            enter_card_title: 'Enter card title...',
            description_optional: 'Description (optional)',
            add: 'Add',
            save: 'Save',
            cancel: 'Cancel',
            edit_card: 'Edit Card',
            delete_card: 'Delete Card',
            rename_list: 'Rename List',
            delete_list: 'Delete List',
            delete_card_confirm: 'Are you sure you want to delete this card?',
            delete_list_confirm: 'Are you sure you want to delete this list? All cards inside will be permanently deleted.',
            add_list_failed: 'Failed to add list.',
            add_card_failed: 'Failed to add card.',
            permission_denied_list: 'Insufficient permissions: Only managers can reorder lists.',
            global_announcement: 'Announcement',
        },
        header: {
            sign_out: 'Sign out',
            upgrade_manager: 'Upgrade to Manager (Test)',
            loading: 'Loading...',
            error: 'Error occurred',
            back_to_departments: 'Home'
        }
    },
    'vi': {
        board: {
            add_list: '+ Thêm danh sách',
            add_card: '+ Thêm thẻ',
            enter_list_title: 'Nhập tên danh sách...',
            enter_card_title: 'Nhập tiêu đề thẻ...',
            description_optional: 'Mô tả (tùy chọn)',
            add: 'Thêm',
            save: 'Lưu',
            cancel: 'Hủy',
            edit_card: 'Chỉnh sửa thẻ',
            delete_card: 'Xóa thẻ',
            rename_list: 'Đổi tên danh sách',
            delete_list: 'Xóa danh sách',
            delete_card_confirm: 'Bạn có chắc chắn muốn xóa thẻ này không?',
            delete_list_confirm: 'Bạn có chắc chắn muốn xóa danh sách này không? Tất cả các thẻ bên trong sẽ bị xóa vĩnh viễn.',
            add_list_failed: 'Thêm danh sách thất bại.',
            add_card_failed: 'Thêm thẻ thất bại.',
            permission_denied_list: 'Không đủ quyền: Chỉ quản lý mới có thể di chuyển danh sách.',
            global_announcement: 'Thông báo',
        },
        header: {
            sign_out: 'Đăng xuất',
            upgrade_manager: 'Nâng cấp Quản lý (Thử nghiệm)',
            loading: 'Đang tải...',
            error: 'Đã xảy ra lỗi',
            back_to_departments: 'Trang chủ'
        }
    }
}

export type Dictionary = typeof dictionaries['zh-TW']
