# Software Requirements Specification (SRS): Duhat Gen Sticker V1

> **Trạng thái:** Bản thảo — chưa phải baseline để cam kết phát hành.  
> Các mục gắn nhãn `TBD` chưa được quyết định và không được phép tự suy diễn khi thiết kế, triển khai hoặc kiểm thử.

## 0. Kiểm soát tài liệu

### 0.1 Thông tin tài liệu

| Trường                 | Giá trị                                                           |
| ------------------------ | ------------------------------------------------------------------- |
| Sản phẩm               | Duhat Gen Sticker                                                   |
| Loại tài liệu         | Software Requirements Specification (SRS)                           |
| Phiên bản tài liệu   | 0.1                                                                 |
| Phiên bản sản phẩm   | V1                                                                  |
| Trạng thái             | Draft                                                               |
| Nền tảng mục tiêu    | Ứng dụng mobile độc lập trên Android và iOS                  |
| Ngôn ngữ tài liệu    | Tiếng Việt                                                        |
| Ngày soạn              | 12/08/2026                                                          |
| Chủ sở hữu tài liệu | TBD                                                                 |
| Nguồn yêu cầu chính  | [PRD_Sticker_Generation_V1_VI.md](./PRD_Sticker_Generation_V1_VI.md) |

### 0.2 Lịch sử phiên bản

| Phiên bản | Ngày      | Nội dung                                                                         | Trạng thái |
| ----------- | ---------- | --------------------------------------------------------------------------------- | ------------ |
| 0.1         | 12/08/2026 | Khởi tạo SRS từ PRD V1 và các quyết định phạm vi đã được xác nhận | Draft        |

### 0.3 Thứ tự ưu tiên nguồn

Khi có khác biệt giữa các nguồn, tài liệu này áp dụng thứ tự ưu tiên sau:

1. Các quyết định phạm vi đã được xác nhận tại Bảng 0.4.
2. `PRD_Sticker_Generation_V1_VI.md`.
3. Các tài liệu của `origin/kien_v5` chỉ được dùng để tham khảo **cấu trúc tài liệu và cách truy vết yêu cầu**. Mọi chi tiết dành riêng cho bản web không phải yêu cầu của Duhat Gen Sticker V1.

Snapshot tham khảo là commit `e24cfdc7a9649e7d61c58d9fe708887ede344000` của `origin/kien_v5` ngày 12/08/2026. Việc ghi snapshot chỉ phục vụ provenance; không biến implementation hoặc thông số của bản web thành yêu cầu V1.

Không sử dụng source code hiện có làm căn cứ để thay đổi yêu cầu của PRD. Nếu một nội dung chưa được hai nguồn đầu tiên xác định, nội dung đó phải được ghi `TBD`.

### 0.4 Các quyết định phạm vi đã xác nhận

| ID      | Quyết định                                                                                           | Ảnh hưởng                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| DEC-001 | Tài liệu nguồn chính xác là `PRD_Sticker_Generation_V1_VI.md`.                                   | SRS và các tài liệu tiếp theo phải truy xuất yêu cầu từ PRD này.                |
| DEC-002 | Sản phẩm là một ứng dụng riêng có tên **Duhat Gen Sticker**, chạy trên Android và iOS. | Thay thế bối cảnh tính năng nằm bên trong DUHAT của PRD.                           |
| DEC-003 | Ba năng lực sản phẩm chính của V1 là tạo, lưu và chia sẻ/xuất sticker; thao tác chia sẻ/xuất sử dụng native share sheet của điện thoại. | Không tích hợp khay sticker, quản lý sticker hoặc chat của DUHAT; đích lưu cụ thể vẫn là `TBD-010`. Xóa dữ liệu và báo cáo được giữ như nghĩa vụ privacy/safety từ PRD, với luồng standalone chưa chốt. |
| DEC-004 | V1 hỗ trợ ảnh có đúng một chủ thể chính: một người, một thú cưng hoặc một vật thể.  | Chốt phạm vi loại chủ thể trong PRD.                                                  |
| DEC-005 | Một lần tạo thành công trả về chính xác **8 sticker**.                                    | Thay thế mọi mô tả “6–8 sticker” trong PRD.                                         |
| DEC-006 | Phong cách hình ảnh cố định của V1 là **Chibi 3D**.                                        | Không có bộ chọn hoặc chuyển đổi phong cách trong V1.                             |
| DEC-007 | Danh sách biểu cảm/câu chữ cố định bằng tiếng Việt và tiếng Anh chưa được chốt (`TBD-001`, `TBD-002`). | Product phải phê duyệt trước khi hoàn thiện generation contract và bộ kiểm thử. |
| DEC-008 | Mọi thông tin PRD chưa xác định phải giữ nguyên là `TBD`.                                    | Không sử dụng giá trị của bản web hoặc tự đặt giá trị thay thế.              |

Nguồn của DEC-001 đến DEC-008 là các xác nhận trực tiếp của người yêu cầu tài liệu trong phiên làm rõ SRS ngày 12/08/2026. Tên người xác nhận và quy trình phê duyệt chính thức là `TBD`; các quyết định này vẫn cần được đưa qua quy trình phê duyệt tài liệu tại Mục 16.

### 0.5 Quy ước trạng thái yêu cầu

| Trạng thái      | Ý nghĩa                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Confirmed`     | Có căn cứ trực tiếp từ PRD hoặc quyết định tại Bảng 0.4; có thể dùng làm yêu cầu bắt buộc.            |
| `TBD-dependent` | Hướng yêu cầu đã có nhưng còn phụ thuộc ít nhất một quyết định `TBD`; chưa thể kiểm thử đầy đủ. |
| `TBD`           | Chưa có đủ căn cứ để xác định yêu cầu hoặc giá trị.                                                       |
| `Out of scope`  | Đã được xác định là ngoài phạm vi V1.                                                                          |

Trong các bảng yêu cầu, phần đứng trước dấu chấm phẩy trong cột **Trạng thái** là trạng thái chuẩn; phần đứng sau dấu chấm phẩy là ghi chú ngắn về dependency. Ví dụ, `Confirmed; threshold TBD` có trạng thái chuẩn là `Confirmed`. Khi cột này chứa `TBD-xxx` trong ngoặc, đó là tham chiếu tới TBD register, không phải trạng thái mới.

Trong tài liệu này, “phải” biểu thị yêu cầu bắt buộc đã được xác nhận. Một câu chứa `TBD` không được xem là cam kết về giá trị chưa chốt.

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này đặc tả các hành vi có thể kiểm tra của Duhat Gen Sticker V1. SRS là đầu vào cho thiết kế kiến trúc, UI/UX, API, mô hình dữ liệu, kế hoạch triển khai và kiểm thử sau này.

SRS chuyển các mục tiêu trong PRD thành:

- ranh giới rõ ràng của ứng dụng mobile độc lập;
- yêu cầu chức năng và quy tắc nghiệp vụ có ID;
- yêu cầu an toàn, quyền riêng tư và chất lượng;
- tiêu chí chấp nhận và ma trận truy vết;
- danh sách quyết định chưa chốt, không che giấu bằng giả định kỹ thuật.

### 1.2 Phạm vi sản phẩm

Duhat Gen Sticker V1 cho phép người dùng sử dụng một ảnh có đúng một chủ thể chính để tạo một bộ gồm đúng 8 sticker Chibi 3D. Chủ thể có thể là một người, một thú cưng hoặc một vật thể. Người dùng được xem trước, chọn kết quả muốn lưu, tạo lại toàn bộ bộ sticker và chia sẻ/xuất kết quả bằng native share sheet của Android hoặc iOS.

Ba năng lực sản phẩm chính là tạo, lưu và chia sẻ/xuất. Khả năng xóa dữ liệu đã lưu được giữ như yêu cầu privacy của PRD. Yêu cầu báo cáo/review/takedown cũng được giữ từ PRD, nhưng actor và luồng phù hợp cho app độc lập là `TBD-016`; tài liệu này không tự thêm một hệ thống quản lý sticker hoặc chat.

Đầu vào và đầu ra phải vượt qua các lớp kiểm tra an toàn tương ứng trước khi đầu ra được hiển thị, lưu hoặc chia sẻ. Ảnh nguồn và dữ liệu tạo sinh phải được xử lý theo các yêu cầu về đồng ý, riêng tư, bảo mật và lưu trữ của tài liệu này.

### 1.3 Đối tượng đọc

- Product và chủ sở hữu sản phẩm.
- Nhóm thiết kế UI/UX.
- Nhóm phát triển mobile, backend và AI.
- Nhóm QA/kiểm thử.
- Nhóm Trust & Safety, Privacy và Legal.
- Nhóm vận hành xử lý báo cáo và gỡ bỏ nội dung.

Việc liệt kê các nhóm trên không mặc định phân công quyền sở hữu; người phê duyệt và RACI là `TBD`.

### 1.4 Thuật ngữ và viết tắt

| Thuật ngữ             | Định nghĩa trong tài liệu này                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ảnh nguồn             | Một ảnh do người dùng chụp hoặc chọn để gửi vào một lần tạo.                                                                            |
| Chủ thể chính        | Người, thú cưng hoặc vật thể mà hệ thống dùng làm đối tượng trung tâm của bộ sticker.                                               |
| Job/tác vụ tạo       | Đơn vị xử lý bắt đầu sau khi người dùng chủ động yêu cầu tạo và kết thúc ở trạng thái thành công, thất bại hoặc quá giờ. |
| Bộ sticker đầy đủ     | Kết quả đầy đủ của một lần tạo thành công, gồm chính xác 8 sticker.                                                                     |
| Tập sticker đã lưu   | Tập con gồm các sticker người dùng chọn để lưu; số lượng tối thiểu và trạng thái chọn mặc định là `TBD-019`.                         |
| Sticker/StickerVariant  | Một output riêng lẻ thuộc bộ sticker đầy đủ.                                                                                                  |
| Sticker được chọn   | Sticker mà người dùng chủ động giữ trong tập sẽ lưu.                                                                                        |
| Tạo lại/Regenerate    | Tạo lại toàn bộ bộ 8 sticker từ cùng ảnh nguồn và phong cách Chibi 3D.                                                                      |
| Moderation/kiểm duyệt | Kiểm tra an toàn nội dung ở đầu vào hoặc đầu ra trước khi cho phép bước tiếp theo.                                                     |
| Native share sheet      | Giao diện chia sẻ do Android hoặc iOS cung cấp để người dùng chọn ứng dụng/đích nhận.                                                   |
| Riêng tư mặc định  | Dữ liệu không tự động được công khai hoặc chia sẻ cho người dùng khác.                                                                 |
| TBD                     | To Be Determined — nội dung bắt buộc phải được quyết định sau, không phải một giá trị mặc định.                                     |

## 2. Mô tả tổng quan

### 2.1 Bối cảnh sản phẩm

Duhat Gen Sticker là ứng dụng độc lập, không phải một màn hình hoặc module bên trong ứng dụng DUHAT. Tên “Duhat” trong tên sản phẩm không tạo ra yêu cầu tích hợp với tài khoản, khay sticker hoặc hệ thống chat của DUHAT. Việc Duhat Gen Sticker có tài khoản riêng hay không là `TBD-012`.

Ranh giới logic của V1:

```text
                                    +---------------------------+
                                    | Dịch vụ tạo/kiểm duyệt    |
                                    | và lưu trữ (TBD-013)      |
                                    +-------------^-------------+
                                                  |
+-------------+      +----------------------------+---------------------------+
| Người dùng |----->|            Duhat Gen Sticker Mobile                    |
+-------------+      |  chọn/chụp -> kiểm tra -> tạo -> xem -> lưu -> chia sẻ |
                     +---------+-------------------------+---------------------+
                               |                         |
                               v                         v
                     +-------------------+      +-----------------------+
                     | Camera/Thư viện  |      | Android/iOS share     |
                     | ảnh của thiết bị |      | sheet -> app bên ngoài|
                     +-------------------+      +-----------------------+
```

Các dịch vụ tạo ảnh, kiểm duyệt, lưu trữ và tài khoản có thể nằm trong hoặc ngoài thiết bị; kiến trúc triển khai cụ thể là `TBD-013`.

### 2.2 Mục tiêu

- Cho phép đi từ chọn ảnh đến xem trước bộ 8 sticker trong một luồng của ứng dụng mobile.
- Giảm thao tác thủ công trong việc tách nền, tạo phong cách và đóng gói sticker.
- Cho phép người dùng quyết định sticker nào được lưu.
- Cho phép chia sẻ/xuất qua cơ chế chuẩn của hệ điều hành.
- Bảo vệ quyền sử dụng ảnh, sự riêng tư, nhận diện chủ thể và an toàn nội dung.
- Đo lường hiệu quả của luồng mà không đưa nội dung ảnh vào analytics.

Mục tiêu định lượng về chất lượng, độ trễ và khả năng vận hành thuộc `TBD-007`, `TBD-009` và `TBD-025`.

### 2.3 Actor và stakeholder

| Đối tượng             | Vai trò                                                                                                         | Ranh giới/quyền                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Người dùng             | Chọn/chụp ảnh, xác nhận quyền sử dụng, tạo, xem, chọn, lưu, tạo lại, xóa, chia sẻ và báo cáo theo flow được duyệt. | Chỉ được chủ động xử lý dữ liệu thuộc phạm vi sở hữu/quyền sử dụng đã xác nhận. Mô hình tài khoản và định nghĩa owner là `TBD-012`; flow báo cáo là `TBD-016`. |
| Android/iOS               | Cấp quyền camera/thư viện, cung cấp native share sheet và các khả năng lưu file được Product chọn. | Hành vi sau khi share sheet bàn giao dữ liệu cho app khác nằm ngoài ranh giới kiểm soát của Duhat Gen Sticker.                                       |
| Dịch vụ tạo ảnh       | Tách nền và tạo bộ sticker theo contract.                                                                   | Nhà cung cấp, model, nơi xử lý dữ liệu và contract là `TBD-013`.                                                                                          |
| Dịch vụ kiểm duyệt    | Kiểm duyệt ảnh đầu vào và kết quả đầu ra.                                                             | Công nghệ, taxonomy, ngưỡng và quy trình review thuộc `TBD-006` và `TBD-013`.                                                                               |
| Product                   | Phê duyệt style, nội dung biểu cảm/câu chữ, quota, hành vi sản phẩm và ngưỡng chất lượng.        | Các quyết định mở được ghi tại Mục 15.                                                                                                                |
| Privacy và Legal         | Phê duyệt retention, training-use, thông báo/đồng ý và chính sách ảnh trẻ vị thành niên.          | Các quyết định liên quan phải hoàn tất trước phát hành.                                                                                             |
| Trust & Safety/Vận hành | Xử lý báo cáo, review và takedown.                                                                          | Quy trình, công cụ, SLA và phân công là `TBD-016`.                                                                                                      |

### 2.4 Môi trường vận hành

- Ứng dụng mobile độc lập trên Android và iOS.
- Phiên bản hệ điều hành tối thiểu: `TBD-015`.
- Danh sách loại thiết bị, kích thước màn hình và năng lực phần cứng được hỗ trợ: `TBD-015`.
- Yêu cầu kết nối mạng và hành vi offline/mạng yếu: `TBD-024`.
- Công nghệ mobile, backend, database, object storage, AI model và nhà cung cấp cloud: `TBD-013`.

### 2.5 Phụ thuộc

- Camera, thư viện ảnh, quyền truy cập và native share sheet của Android/iOS.
- Khả năng kiểm tra hợp lệ và kiểm duyệt ảnh đầu vào.
- Khả năng tách nền và tạo ảnh Chibi 3D.
- Khả năng kiểm duyệt đầu ra trước khi hiển thị/chia sẻ.
- Phong cách Chibi 3D và catalog biểu cảm/câu chữ cố định dùng cho 8 output, cần được Product phê duyệt.
- Quyết định về lưu trữ, retention, xóa dữ liệu và training-use.
- Quy trình báo cáo, review và takedown trước khi ra mắt.
- Tập dữ liệu đánh giá chất lượng, an toàn, định kiến và độ trung thực nhận diện.

### 2.6 Ràng buộc đã xác nhận

- Mỗi lần tạo sử dụng đúng một ảnh nguồn.
- Mỗi ảnh có đúng một chủ thể chính thuộc một trong ba loại: người, thú cưng hoặc vật thể.
- Ảnh người phải có đúng một khuôn mặt rõ ràng.
- Một lần tạo thành công trả đúng 8 sticker.
- V1 chỉ có phong cách Chibi 3D.
- Biểu cảm/câu chữ chỉ được lấy từ catalog cố định cần được Product phê duyệt; nội dung, số mục và mapping với 8 output là `TBD-001`/`TBD-002`.
- Không có prompt tự do hoặc chỉnh sửa riêng từng sticker.
- Chia sẻ/xuất chỉ qua native share sheet; không tích hợp DUHAT chat/tray.
- Kiểm duyệt đầu vào và đầu ra phải hoàn tất trước các mốc cho phép tương ứng.

### 2.7 Ngoài phạm vi V1

- Ứng dụng web.
- Tích hợp với khay sticker, quản lý pack hoặc chat của DUHAT. Mô hình tài khoản riêng của Duhat Gen Sticker vẫn là `TBD-012`.
- Chat 1-1 hoặc chat nhóm bên trong Duhat Gen Sticker.
- Câu chữ được AI sinh động theo ngữ cảnh hoặc phong cách người dùng.
- Prompt văn bản tự do.
- Chọn hoặc chuyển đổi giữa nhiều phong cách hình ảnh.
- Chỉnh sửa riêng tư thế, biểu cảm, trang phục, câu chữ, style hoặc nền của từng sticker.
- Tạo lại riêng một sticker.
- Kết hợp hai sticker hoặc nhiều ảnh tham chiếu.
- Tạo người nổi tiếng, nhân vật công cộng, nhân vật có thương hiệu hoặc nhân vật có bản quyền.
- Marketplace, khám phá công khai, bán hoặc thương mại hóa bộ sticker.
- Kết quả photorealistic hoặc deepfake.
- Gợi ý sticker dựa trên ngữ cảnh trò chuyện riêng tư.
- Tích hợp xuất trực tiếp dành riêng cho một nền tảng bên thứ ba. Các app bên thứ ba có thể xuất hiện như đích do native share sheet cung cấp.

## 3. Luồng người dùng và use case

### 3.1 Danh mục use case

| ID    | Use case                                   | Trạng thái                                                |
| ----- | ------------------------------------------ | ----------------------------------------------------------- |
| UC-01 | Tạo và xem trước bộ 8 sticker         | Confirmed                                                   |
| UC-02 | Chọn và lưu sticker                     | Confirmed; phụ thuộc `TBD-010` và `TBD-019`           |
| UC-03 | Tạo lại toàn bộ bộ sticker            | Confirmed; phụ thuộc `TBD-005`                           |
| UC-04 | Chia sẻ/xuất qua native share sheet      | Confirmed; phụ thuộc `TBD-011`                           |
| UC-05 | Xóa dữ liệu đã lưu                    | Confirmed; chi tiết phụ thuộc `TBD-010` và `TBD-018`  |
| UC-06 | Báo cáo output hoặc hành vi lạm dụng | TBD-dependent; luồng standalone là `TBD-016`            |

### 3.2 UC-01 — Tạo và xem trước bộ sticker

**Actor chính:** Người dùng.

**Tiền điều kiện:**

- Ứng dụng đã được mở.
- Người dùng có quyền hợp pháp sử dụng ảnh và sẽ xác nhận điều này trong luồng.
- Các điều kiện tài khoản/xác thực, nếu có, là `TBD-012`.

**Luồng chính:**

1. Người dùng bắt đầu luồng tạo trong Duhat Gen Sticker.
2. Ứng dụng giải thích chức năng và yêu cầu đối với ảnh được hỗ trợ.
3. Người dùng chọn ảnh từ thư viện hoặc chụp một ảnh bằng camera.
4. Người dùng xác nhận sở hữu hoặc có quyền sử dụng ảnh.
5. Hệ thống kiểm tra kỹ thuật, chất lượng, loại/số lượng chủ thể và an toàn đầu vào.
6. Sau khi ảnh hợp lệ, người dùng chủ động bắt đầu tạo.
7. Hệ thống hiển thị trạng thái tiến trình và xử lý bộ sticker.
8. Hệ thống kiểm duyệt tất cả đầu ra.
9. Nếu job thành công và toàn bộ điều kiện phát hành kết quả được đáp ứng, ứng dụng hiển thị đúng 8 sticker Chibi 3D.
10. Người dùng có thể xem toàn bộ bộ và từng sticker.

**Hậu điều kiện thành công:**

- Bộ 8 sticker đã qua kiểm duyệt sẵn sàng để chọn và lưu.
- Không sticker nào được tự động công khai hoặc chia sẻ.

### 3.3 Luồng thay thế và lỗi của UC-01

| Nhánh | Điều kiện                                                      | Hành vi yêu cầu                                                                                                                                |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AF-01  | Quyền camera hoặc thư viện bị từ chối                      | Ứng dụng không được truy cập trái phép; hướng dẫn và đường khôi phục cụ thể là `TBD-022`.                                   |
| AF-02  | Ảnh sai định dạng/dung lượng/độ phân giải/chất lượng | Giữ người dùng trong luồng, hiển thị lý do có thể hành động khi an toàn và cho chọn ảnh khác. Ngưỡng cụ thể là `TBD-008`. |
| AF-03  | Không có đúng một chủ thể chính được hỗ trợ          | Từ chối và cho chọn ảnh khác. Quy tắc ảnh hỗn hợp/hậu cảnh là `TBD-008`.                                                            |
| AF-04  | Ảnh người không có đúng một khuôn mặt rõ               | Từ chối; ảnh nhiều người phải kèm hướng dẫn cắt/chọn ảnh khác.                                                                     |
| AF-05  | Ảnh không vượt qua kiểm duyệt đầu vào                    | Không bắt đầu generation; lý do chỉ được hiển thị ở mức an toàn.                                                                    |
| AF-06  | Generation thất bại hoặc quá giờ                             | Hiển thị lỗi không chặn và cho thử lại; không tạo bộ đã lưu bán phần. Timeout/retry là `TBD-007` và `TBD-014`.               |
| AF-07  | Một phần output không vượt kiểm duyệt                      | Không hiển thị/lưu/chia sẻ item bị chặn. Hủy toàn bộ hay hiển thị phần an toàn là `TBD-006`.                                      |
| AF-08  | Người dùng rời màn hình sau khi submit thành công         | Job không bị âm thầm hủy hoặc mất chỉ vì điều hướng. Hành vi khi app bị kill/restart là `TBD-014`.                               |

### 3.4 UC-02 — Chọn và lưu sticker

1. Người dùng mở bộ sticker đã tạo thành công.
2. Ứng dụng cho phép chọn hoặc bỏ chọn từng sticker.
3. Người dùng chủ động yêu cầu lưu.
4. Hệ thống chỉ lưu các sticker đang được chọn.
5. Dữ liệu đã lưu ở trạng thái riêng tư mặc định. Đích lưu và hành vi truy cập lại thuộc `TBD-010`.

Trạng thái chọn mặc định, số lượng tối thiểu được phép lưu và đích lưu là `TBD-019` và `TBD-010`.

Nếu lưu thất bại, preview phải vẫn khả dụng để thử lưu lại mà không cần tạo lại ngay. Thời gian duy trì preview là `TBD-020`.

### 3.5 UC-03 — Tạo lại toàn bộ bộ sticker

1. Từ preview, người dùng chọn tạo lại.
2. Hệ thống sử dụng cùng ảnh nguồn và phong cách Chibi 3D.
3. Hệ thống tạo lại toàn bộ 8 sticker; không tạo lại hoặc sửa riêng một sticker.
4. Kết quả mới trải qua kiểm duyệt đầu ra trước khi hiển thị.

Quota, chi phí và việc giữ kết quả preview cũ là `TBD-005`; chính sách retry là `TBD-014`.

### 3.6 UC-04 — Chia sẻ/xuất sticker

1. Người dùng chủ động chọn thao tác chia sẻ/xuất trên output được phép chia sẻ.
2. Ứng dụng chuẩn bị payload theo output contract được duyệt.
3. Ứng dụng gọi native share sheet của Android hoặc iOS.
4. Người dùng chọn hoặc hủy đích chia sẻ trong giao diện hệ điều hành.

Nguồn màn hình cho phép share, yêu cầu phải lưu trước hay không, chia sẻ một/nhiều item, định dạng file và đóng gói là `TBD-011`.

Việc app nhận bên ngoài lưu, gửi tiếp, thay đổi hoặc xóa payload sau khi nhận nằm ngoài ranh giới kiểm soát của Duhat Gen Sticker.

### 3.7 UC-05 — Xóa dữ liệu đã lưu

Người dùng phải có khả năng xóa dữ liệu sticker đã lưu. Cách tiếp cận dữ liệu để thực hiện thao tác xóa phụ thuộc mô hình lưu trữ tại `TBD-010`; đơn vị xóa, UX xác nhận, xóa mềm/xóa cứng, phạm vi áp dụng tới storage/cache/backup và SLA xóa là `TBD-018`.

Việc xóa trong Duhat Gen Sticker không thể thu hồi các bản sao mà người dùng đã chia sẻ cho ứng dụng hoặc người nhận bên ngoài.

### 3.8 UC-06 — Báo cáo output hoặc hành vi lạm dụng

PRD yêu cầu khả năng báo cáo nội dung sử dụng hình ảnh không được phép, quấy rối, vi phạm bản quyền, kết quả không chính xác/“Không giống tôi” hoặc lạm dụng khác, đồng thời yêu cầu quy trình review và takedown trước khi ra mắt. Tuy nhiên, actor, entry point, đối tượng bị báo cáo và luồng xử lý trong app độc lập chưa được xác định. Use case này được giữ ở trạng thái `TBD-016` và không được tự thiết kế trước khi Product, Trust & Safety và Legal chốt quyết định.

## 4. Yêu cầu chức năng

### 4.1 Khởi tạo luồng và đồng ý

| ID         | Yêu cầu                                                                                                                                      | Trạng thái  | Nguồn                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| FR-ENT-001 | Ứng dụng phải cung cấp một điểm bắt đầu luồng tạo ngay trong Duhat Gen Sticker.                                                    | Confirmed     | DEC-002; PRD §7.1 được điều chỉnh cho app độc lập |
| FR-ENT-002 | Khi bắt đầu luồng, ứng dụng phải giải thích chức năng và yêu cầu đối với ảnh được hỗ trợ.                               | Confirmed     | PRD §7.1                                                   |
| FR-CNS-001 | Trước khi gửi ảnh để tạo, ứng dụng phải yêu cầu người dùng chủ động xác nhận họ sở hữu hoặc có quyền sử dụng ảnh. | Confirmed     | PRD §5.1, §7.1, §8.1, F3                                 |
| FR-CNS-002 | Hệ thống không được cho phép bắt đầu generation nếu chưa có xác nhận đồng ý cho ảnh nguồn hiện tại.                      | Confirmed     | PRD §7.1, §7.3, F3                                        |
| FR-CNS-003 | Nội dung consent, version, bằng chứng và thời gian lưu consent phải tuân theo policy được duyệt.                                   | TBD-dependent | TBD-004, TBD-012, TBD-028                                   |

### 4.2 Chọn ảnh và quyền thiết bị

| ID         | Yêu cầu                                                                                                                                                       | Trạng thái  | Nguồn                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------- |
| FR-INP-001 | Người dùng phải có thể chọn đúng một ảnh nguồn từ thư viện ảnh của thiết bị, tùy theo quyền nền tảng.                                    | Confirmed     | PRD §5.1, §7.2, F1                     |
| FR-INP-002 | Người dùng phải có thể chụp đúng một ảnh nguồn bằng camera, tùy theo quyền nền tảng.                                                           | Confirmed     | PRD §5.1, §7.2, F1                     |
| FR-INP-003 | Ứng dụng chỉ được truy cập camera/thư viện trong phạm vi quyền do người dùng và hệ điều hành cấp.                                           | Confirmed     | PRD §7.2; ràng buộc nền tảng mobile |
| FR-INP-004 | Hành vi và UX khôi phục khi quyền camera/thư viện bị từ chối, giới hạn hoặc thu hồi phải theo quyết định `TBD-022`. | TBD | PRD §7.2 chưa xác định failure UX; TBD-022 |
| FR-INP-005 | Ảnh nguồn không được tự động đưa vào thư viện công khai hoặc chia sẻ với người dùng khác.                                                 | Confirmed     | PRD §7.2                                |

### 4.3 Kiểm tra hợp lệ và an toàn đầu vào

| ID          | Yêu cầu                                                                                                                                                   | Trạng thái                  | Nguồn                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------- |
| FR-VAL-001  | Trước generation, hệ thống phải kiểm tra định dạng, dung lượng, độ phân giải tối thiểu, độ mờ, ánh sáng và khả năng hiển thị của chủ thể. | Confirmed; giá trị TBD      | PRD §5.1, §7.2, F2; TBD-008 |
| FR-VAL-002  | Hệ thống chỉ được chấp nhận một ảnh có đúng một chủ thể chính thuộc loại người, thú cưng hoặc vật thể.                            | Confirmed; quy tắc biên TBD | DEC-004; PRD §5.1; TBD-008   |
| FR-VAL-003  | Với ảnh người, hệ thống phải yêu cầu đúng một khuôn mặt rõ ràng.                                                                            | Confirmed; ngưỡng TBD       | PRD §5.1, §7.2, §8.1; TBD-008 |
| FR-VAL-004  | Ảnh chứa nhiều người phải bị từ chối kèm hướng dẫn cắt ảnh hoặc chọn ảnh khác.                                                           | Confirmed                     | PRD §7.2                     |
| FR-VAL-005  | Ảnh không đạt chất lượng hoặc an toàn phải bị từ chối kèm lý do cụ thể, có thể hành động khi việc cung cấp lý do là an toàn.     | Confirmed; reason taxonomy TBD | PRD §7.2, §7.6; TBD-021      |
| FR-VAL-006  | Validation failure phải giữ người dùng trong luồng và cho phép chọn ảnh khác.                                                                    | Confirmed                     | PRD §7.6                     |
| FR-SAFE-001 | Kiểm duyệt an toàn đầu vào phải hoàn tất trước khi generation được phép bắt đầu.                                                          | Confirmed                     | PRD §7.3, §8.2, F2, F6      |

### 4.4 Tạo sticker

| ID          | Yêu cầu                                                                                                                            | Trạng thái                        | Nguồn                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | -------------------------------------- |
| FR-GEN-001  | Sau khi consent và validation thành công, generation chỉ được bắt đầu bởi hành động chủ động của người dùng.    | Confirmed                           | PRD §7.3                              |
| FR-GEN-002  | Hệ thống phải tách nền và chuyển chủ thể thành hình ảnh phi thực tế theo phong cách Chibi 3D.                         | Confirmed; background contract TBD  | DEC-006; PRD §5.1, §7.3, F4; TBD-009 |
| FR-GEN-003  | Một job tạo thành công phải trả về chính xác 8 sticker.                                                                     | Confirmed; partial moderation TBD   | DEC-005; PRD §4, §7.3, F5; TBD-006   |
| FR-GEN-004  | Cả 8 sticker phải dùng biểu cảm và, nếu áp dụng cho item đó, câu chữ từ catalog cố định cần được Product phê duyệt. | TBD-dependent | DEC-007; PRD §5.1, §7.3, F5; TBD-001, TBD-002 |
| FR-GEN-005  | Catalog phải hỗ trợ câu chữ cố định bằng tiếng Việt và tiếng Anh. Cách chọn hoặc ánh xạ ngôn ngữ là `TBD-002`. | TBD-dependent                       | PRD §5.1; TBD-001, TBD-002            |
| FR-GEN-006  | V1 không được cung cấp prompt tự do hoặc bộ chọn style.                                                                     | Confirmed                           | DEC-006; PRD §5.2                     |
| FR-GEN-007  | V1 không được cho phép sửa riêng câu chữ, tư thế, biểu cảm, trang phục, nền hoặc style của từng sticker.           | Confirmed                           | PRD §5.2, §7.4                       |
| FR-GEN-008  | Giao diện phải hiển thị trạng thái tiến trình của job đã submit.                                                          | Confirmed; stage contract TBD       | PRD §7.3, §10.2; TBD-014             |
| FR-GEN-009  | Điều hướng khỏi màn hình generation không được âm thầm hủy hoặc làm mất job đã submit thành công.               | Confirmed; app-restart behavior TBD | PRD §7.3, §10.2; TBD-014             |
| FR-SAFE-002 | Tất cả output phải hoàn tất kiểm duyệt trước khi được hiển thị, lưu hoặc chia sẻ.                                   | Confirmed                           | PRD §4, §7.3, §8.2, F6              |
| FR-SAFE-003 | Output bị xác định không an toàn hoặc lạm dụng không được hiển thị, lưu hoặc chia sẻ.                              | Confirmed                           | PRD §7.6, §8.2                       |
| FR-SAFE-004 | Hành vi khi chỉ một phần trong 8 output bị chặn phải theo quyết định `TBD-006`.                                           | TBD                                 | PRD §7.6, §14                        |

### 4.5 Xem trước, chọn và tạo lại

| ID         | Yêu cầu                                                                                                      | Trạng thái | Nguồn                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------- |
| FR-PRV-001 | Ứng dụng phải hiển thị giao diện xem trước toàn bộ bộ sticker đã được phép hiển thị.        | Confirmed    | PRD §5.1, §7.4, F7                   |
| FR-PRV-002 | Người dùng phải có thể kiểm tra từng sticker trong preview.                                            | Confirmed    | PRD §5.1, §7.4                       |
| FR-SEL-001 | Người dùng phải có thể chọn và bỏ chọn từng sticker trước khi lưu.                               | Confirmed    | PRD §5.1, §7.4, F7                   |
| FR-SEL-002 | Trạng thái chọn mặc định và hành vi khi chọn 0 sticker phải theo `TBD-019`.                         | TBD          | PRD không xác định                 |
| FR-REG-001 | Người dùng phải có thể tạo lại toàn bộ bộ 8 sticker từ cùng ảnh nguồn và phong cách Chibi 3D. | Confirmed    | DEC-005, DEC-006; PRD §5.1, §7.4, F7 |
| FR-REG-002 | Tạo lại không được chỉ thay đổi riêng một sticker.                                                  | Confirmed    | PRD §7.4 và ngoài phạm vi V1       |
| FR-REG-003 | Quota, tính phí, số lần tạo lại và việc giữ kết quả trước đó phải theo `TBD-005`.             | TBD          | PRD §7.4, §14                        |

### 4.6 Lưu và quản lý dữ liệu đã lưu

| ID         | Yêu cầu                                                                                                                                           | Trạng thái                   | Nguồn                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------- |
| FR-SAV-001 | Lưu sticker phải là hành động chủ động của người dùng.                                                                                 | Confirmed                      | PRD §7.5                                 |
| FR-SAV-002 | Hệ thống chỉ được lưu các sticker đang được người dùng chọn.                                                                        | Confirmed                      | PRD §5.1, §7.5, F7                      |
| FR-SAV-003 | Sticker/bộ sticker đã lưu phải riêng tư mặc định và không được tự động công khai.                                                | Confirmed; ownership model TBD | PRD §5.1, §7.5, §8.5; TBD-010, TBD-012 |
| FR-SAV-004 | Đích lưu, cách truy cập lại và khả năng xem/chia sẻ từ dữ liệu đã lưu phải theo mô hình được phê duyệt tại `TBD-010` và `TBD-011`. | TBD | DEC-003; thay thế DUHAT tray; TBD-010, TBD-011 |
| FR-SAV-005 | Nếu lưu thất bại, preview hiện tại phải còn khả dụng để người dùng thử lưu lại mà không cần tạo lại ngay.                    | Confirmed; thời gian TBD      | PRD §7.6; TBD-020                        |
| FR-SAV-006 | Job generation thất bại không được tạo ra bộ sticker đã lưu bán phần.                                                                  | Confirmed                      | PRD §7.6                                 |
| FR-DEL-001 | Người dùng phải có khả năng xóa dữ liệu sticker đã lưu theo đơn vị xóa được Product phê duyệt. | Confirmed; semantics TBD | PRD §7.5, §8.5, F10; TBD-018 |

### 4.7 Chia sẻ/xuất

| ID         | Yêu cầu                                                                                                                               | Trạng thái           | Nguồn                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| FR-SHR-001 | Ứng dụng phải cho phép người dùng chủ động gọi native share sheet của Android/iOS đối với output được phép chia sẻ. | Confirmed; payload TBD | DEC-003; thay thế PRD §7.5/F9; TBD-011     |
| FR-SHR-002 | Chỉ output đã vượt qua kiểm duyệt đầu ra mới được đưa vào share payload.                                                | Confirmed              | PRD §4, §8.2, F6                           |
| FR-SHR-003 | Thao tác chia sẻ một sticker không được tự động công khai toàn bộ bộ sticker.                                             | Confirmed              | PRD §7.5 được điều chỉnh theo DEC-003 |
| FR-SHR-004 | V1 không được phụ thuộc vào tích hợp khay sticker hoặc chat của DUHAT để chia sẻ.                                         | Confirmed              | DEC-002, DEC-003                             |
| FR-SHR-005 | Nguồn màn hình, điều kiện phải lưu trước, số item mỗi lần share, định dạng và cách đóng gói phải theo `TBD-011`. | TBD                    | PRD không xác định cho app standalone    |

### 4.8 Lỗi và khôi phục

| ID         | Yêu cầu                                                                                                               | Trạng thái             | Nguồn                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| FR-ERR-001 | Lỗi validation phải giữ người dùng trong luồng và cho chọn ảnh khác.                                         | Confirmed                | PRD §7.6                                |
| FR-ERR-002 | Generation timeout/failure phải hiển thị lỗi không chặn và cung cấp hành động thử lại.                     | Confirmed; policy TBD    | PRD §7.6; TBD-007, TBD-014              |
| FR-ERR-003 | Lỗi lưu phải giữ preview để thử lưu lại.                                                                       | Confirmed; retention TBD | PRD §7.6; TBD-020                       |
| FR-ERR-004 | Thông báo lỗi và dữ liệu chẩn đoán phía client không được làm lộ nội dung hoặc tham chiếu ảnh nhạy cảm. | Confirmed | PRD §8.5, §10.3 |
| FR-ERR-005 | Taxonomy mã lỗi, retryable/non-retryable và thông điệp hiển thị là `TBD-021`.                                 | TBD                      | PRD chỉ xác định nhóm failure state |

### 4.9 Báo cáo và gỡ bỏ

| ID         | Yêu cầu                                                                                                                                                                                                         | Trạng thái                  | Nguồn                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------- |
| FR-REP-001 | Hệ thống phải hỗ trợ báo cáo việc sử dụng hình ảnh không được phép, quấy rối, vi phạm bản quyền, kết quả không chính xác/“Không giống tôi” hoặc lạm dụng khác. Actor và entry point phù hợp cho app standalone là `TBD-016`. | TBD-dependent | PRD §5.1, §8.2, §8.4, F10 |
| FR-REP-002 | Quy trình nhận báo cáo, review và takedown phải tồn tại trước khi ra mắt.                                                                                                                              | Confirmed; quy trình/SLA TBD | PRD §8.2; TBD-016     |
| FR-REP-003 | Dữ liệu bằng chứng, quyền truy cập, retention, thông báo kết quả và appeal là `TBD-016`.                                                                                                             | TBD                           | PRD không xác định |

### 4.10 Analytics

| ID         | Yêu cầu                                                                                                                                                                              | Trạng thái          | Nguồn                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------- |
| FR-ANL-001 | Danh sách analytics event được bật, schema và policy ghi nhận phải theo `TBD-017`. Các event ứng viên từ PRD được liệt kê tại Mục 12.1. | TBD | PRD §11 mô tả event có thể ghi nhận; TBD-017 |
| FR-ANL-002 | Analytics không được chứa nội dung ảnh nguồn hoặc ảnh được tạo.                                                                                                          | Confirmed             | PRD §4, §8.5, §11   |
| FR-ANL-003 | Event “gửi sticker trong chat” và metric theo cuộc trò chuyện của PRD không áp dụng cho app standalone. Semantics đo share sheet là `TBD-017`.                           | TBD                   | DEC-003                |
| FR-ANL-004 | Event schema, thuộc tính, consent, retention, deduplication và định nghĩa metric phải theo `TBD-017`.                                                                          | TBD                   | PRD không xác định |

## 5. Quy tắc nghiệp vụ

| ID     | Quy tắc                                                                                                                                                                                                | Trạng thái                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| BR-001 | Mỗi generation job sử dụng đúng một ảnh nguồn.                                                                                                                                                  | Confirmed                           |
| BR-002 | Ảnh V1 phải có đúng một chủ thể chính là một người, một thú cưng hoặc một vật thể.                                                                                                  | Confirmed; boundary TBD             |
| BR-003 | Ảnh người phải có đúng một khuôn mặt rõ; ảnh nhiều người bị từ chối.                                                                                                                  | Confirmed; threshold TBD            |
| BR-004 | Consent hợp lệ cho ảnh hiện tại là điều kiện tiên quyết của generation.                                                                                                                     | Confirmed                           |
| BR-005 | Một generation thành công theo full-set contract phải trả đúng 8 sticker.                                                                                                                        | Confirmed; partial moderation TBD   |
| BR-006 | Style duy nhất của V1 là Chibi 3D; không có style selector.                                                                                                                                        | Confirmed                           |
| BR-007 | Biểu cảm/câu chữ là catalog cố định do Product duyệt; người dùng không nhập prompt hoặc sửa riêng item.                                                                                | TBD-dependent                       |
| BR-008 | Output phải phi thực tế, không phải photorealistic/deepfake.                                                                                                                                       | Confirmed; classifier/threshold TBD |
| BR-009 | Input và output phải qua kiểm duyệt trước khi output được phép hiển thị, lưu hoặc chia sẻ.                                                                                               | Confirmed                           |
| BR-010 | Item bị chặn không được hiển thị, lưu hoặc chia sẻ.                                                                                                                                          | Confirmed                           |
| BR-011 | Save là hành động chủ động và chỉ áp dụng cho sticker được chọn.                                                                                                                         | Confirmed                           |
| BR-012 | Sticker/bộ sticker được tạo mặc định không công khai.                                                                                                                                         | Confirmed                           |
| BR-013 | Regenerate áp dụng cho toàn bộ bộ 8 sticker, không áp dụng từng item.                                                                                                                          | Confirmed                           |
| BR-014 | Người nổi tiếng, nhân vật công cộng, nhân vật có thương hiệu hoặc bản quyền nằm ngoài phạm vi V1. | Confirmed |
| BR-015 | Mạo danh, lừa đảo, quấy rối, tình dục hóa hoặc lạm dụng người khác đều bị cấm.                                                                                                       | Confirmed                           |
| BR-016 | Nội dung không an toàn hoặc tình dục hóa liên quan đến trẻ vị thành niên luôn phải bị chặn. | Confirmed |
| BR-017 | Job thất bại không được tạo bộ sticker đã lưu bán phần.                                                                                                                                    | Confirmed                           |
| BR-018 | Ảnh nguồn không được đưa vào analytics hoặc application logs.                                                                                                                                 | Confirmed                           |
| BR-019 | Không được sử dụng ảnh nguồn/output để training cho đến khi có policy, notice và consent phù hợp được phê duyệt.                                                                   | Confirmed; policy TBD               |
| BR-020 | Chia sẻ V1 dùng native OS share sheet và không dùng DUHAT chat/tray integration.                                                                                                                   | Confirmed                           |
| BR-021 | Cách phân biệt vật thể hợp lệ với logo, đồ chơi, sản phẩm hoặc nhân vật có thương hiệu/bản quyền phải theo `TBD-023`. | TBD |
| BR-022 | Ảnh trẻ vị thành niên nói chung bị chặn hay được phép theo privacy rules nghiêm ngặt hơn phải theo `TBD-003`. | TBD |

## 6. Vòng đời luồng tạo và job

### 6.1 Trạng thái logic

Bảng dưới mô tả trạng thái **quan sát được của toàn bộ luồng tạo**, không ấn định tên enum hoặc cách lưu trữ trong implementation. `GenerationJob` chỉ bắt đầu sau hành động submit của người dùng; ba trạng thái đầu là trạng thái của flow trước khi job tồn tại.

| Trạng thái logic          | Ý nghĩa                                                             | Điều kiện rời trạng thái                                       |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Chuẩn bị đầu vào       | Người dùng đang chọn ảnh/xác nhận consent.                    | Có ảnh và consent để validation.                                |
| Đang kiểm tra             | Hệ thống kiểm tra kỹ thuật, chủ thể và an toàn đầu vào.   | Pass hoặc validation failure.                                       |
| Sẵn sàng tạo             | Ảnh đã hợp lệ; chờ hành động chủ động của người dùng. | Người dùng yêu cầu tạo hoặc thay ảnh.                        |
| Đã submit/đang xử lý   | Job đã được chấp nhận và đang tạo output.                   | Chuyển sang kiểm duyệt, failure hoặc timeout.                    |
| Đang kiểm duyệt đầu ra | Output chưa được phép hiển thị.                                | Tất cả điều kiện phát hành pass hoặc áp dụng nhánh block. |
| Sẵn sàng xem trước      | Bộ output được phép hiển thị.                                  | Người dùng chọn/lưu/regenerate/rời màn hình.                 |
| Đang lưu                  | Hệ thống xử lý yêu cầu lưu chủ động.                        | Save success hoặc save failure.                                     |
| Đã lưu                   | Dữ liệu đã lưu theo storage model được duyệt.                | Hành vi tiếp theo phụ thuộc `TBD-010`, `TBD-011` và `TBD-018`. |
| Thất bại                  | Job không hoàn thành; không tạo saved partial set.               | Người dùng retry hoặc bắt đầu lại.                           |
| Quá giờ                   | Job vượt timeout được duyệt.                                    | Người dùng retry hoặc hệ thống reconcile theo policy.          |

Tên trạng thái kỹ thuật, stage, progress unit và event contract là `TBD-014`.

### 6.2 Luồng chuyển trạng thái

```text
Chọn/chụp ảnh
      |
      v
Consent -> Validation đầu vào --fail--> Chọn ảnh khác
                 |
                pass
                 v
       Người dùng bấm Tạo
                 |
                 v
        Generation + progress ----failure/timeout----> Hành động thử lại (TBD-005/007)
                 |
                 v
       Moderation đầu ra --------block---------------> TBD-006
                 |
                pass
                 v
        Preview đúng 8 sticker
          |          |          |
          v          v          v
       Chọn/lưu   Regenerate   Share (điểm gọi TBD-011)
          |
       save fail -> giữ preview
```

### 6.3 Invariant bắt buộc

- Không submit generation nếu thiếu consent hoặc ảnh chưa pass validation đầu vào.
- Không hiển thị, lưu hoặc chia sẻ output trước khi moderation đầu ra hoàn tất.
- Full-set success phải có đúng 8 sticker Chibi 3D.
- Điều hướng khỏi màn hình không tự hủy job đã submit thành công.
- Job thất bại không tạo saved partial set.
- Save failure không làm mất preview ngay lập tức.
- Regenerate không thay đổi style và không chỉ xử lý riêng một item.
- Không tự động share hoặc public output.

### 6.4 Retry, resume và idempotency

PRD yêu cầu retry và không làm mất job khi rời màn hình, nhưng chưa xác định:

- timeout và số lần retry;
- retry thủ công/tự động;
- backoff;
- resume khi app background, bị kill, crash hoặc thiết bị restart;
- cancel job;
- chống submit trùng/idempotency key;
- stale-job reconciliation;
- việc giữ/tái sử dụng ảnh nguồn và artifact khi regenerate;
- số job đồng thời.

Toàn bộ các quyết định trên thuộc `TBD-005`, `TBD-007` và `TBD-014`.

## 7. Yêu cầu giao diện

### 7.1 Giao diện người dùng logic

SRS yêu cầu các trạng thái giao diện sau nhưng không ấn định số lượng màn hình, route, layout hoặc design system:

| UI state                   | Nội dung/hành động bắt buộc                                                 |
| -------------------------- | --------------------------------------------------------------------------------- |
| Giới thiệu/bắt đầu    | Mô tả tính năng, yêu cầu ảnh và điểm bắt đầu.                        |
| Chọn ảnh                 | Camera, thư viện và consent; việc có preview ảnh nguồn hay không là quyết định UI `TBD-022`. |
| Validation failure         | Lý do an toàn, có thể hành động; chọn ảnh khác.                         |
| Sẵn sàng tạo            | Hành động chủ động bắt đầu generation.                                   |
| Đang tạo                 | Progress, trạng thái và xử lý khi rời màn hình.                           |
| Generation failure/timeout | Lỗi không chặn và hành động retry.                                         |
| Preview                    | Xem bộ/từng sticker, chọn/bỏ chọn, lưu, regenerate và share theo decision. |
| Save failure               | Giữ preview và cho retry save.                                                  |
| Dữ liệu đã lưu        | Hành vi xem/share/xóa phụ thuộc `TBD-010`, `TBD-011` và `TBD-018`. |
| Report                     | `TBD-016`.                                                                      |

### 7.2 Giao diện hệ điều hành và thiết bị

| ID        | Interface             | Yêu cầu                                                         | Chi tiết TBD                                                             |
| --------- | --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| IF-OS-001 | Camera                | Yêu cầu quyền phù hợp; nhận một ảnh nguồn.               | Permission copy, limited access, camera unavailable, metadata.            |
| IF-OS-002 | Thư viện ảnh       | Yêu cầu quyền phù hợp; chọn một ảnh nguồn.               | Limited library, cloud-only asset, định dạng chuyển đổi.            |
| IF-OS-003 | Share sheet           | Gọi native share sheet bằng hành động chủ động.           | Payload, MIME, file URI lifecycle, multi-item support, completion signal. |
| IF-OS-004 | Lưu trên thiết bị | Chỉ áp dụng nếu storage model chọn Photos/Files/app storage. | `TBD-010`.                                                              |
| IF-OS-005 | App lifecycle         | Không mất job chỉ vì điều hướng khỏi màn hình.         | Background/kill/restart/notification: `TBD-014`.                         |

### 7.3 Giao diện dịch vụ logic

Kiến trúc có thể thay đổi, nhưng giải pháp được chọn phải cung cấp các capability sau:

| ID | Capability | Hành vi bắt buộc | Contract chưa chốt |
| --- | --- | --- | --- |
| IF-SVC-001 | Xác định người dùng/owner | Bảo vệ dữ liệu riêng tư theo owner model được duyệt. | Có tài khoản hay device-local, auth/token/session: `TBD-012`. |
| IF-SVC-002 | Nhận ảnh | Nhận đúng một ảnh đã consent và áp dụng validation theo thiết kế được duyệt. | Boundary, endpoint/schema/upload/progress/abort: `TBD-013`, `TBD-014`. |
| IF-SVC-003 | Tạo job | Bắt đầu generation chỉ sau hành động người dùng. | Request/response, idempotency: `TBD-013`, `TBD-014`. |
| IF-SVC-004 | Theo dõi job | Cung cấp progress, terminal status và error an toàn. | Polling/push/background delivery: `TBD-014`. |
| IF-SVC-005 | Regenerate | Tạo lại toàn bộ bộ từ cùng ảnh/style. | Artifact reuse, quota, idempotency: `TBD-005`, `TBD-014`. |
| IF-SVC-006 | Moderation | Chặn input/output không an toàn ở boundary được kiến trúc phê duyệt. | Vendor, taxonomy, threshold, review: `TBD-006`, `TBD-013`. |
| IF-SVC-007 | Lưu/xóa | Lưu riêng tư và xóa theo policy. | Storage, API, ownership, cascade: `TBD-010`, `TBD-018`. |
| IF-SVC-008 | Báo cáo | Nhận report và hỗ trợ review/takedown nếu nằm trong app. | `TBD-016`. |

Không có endpoint, provider hoặc schema từ `kien_v5` được mặc định áp dụng cho V1 này.

## 8. Hợp đồng dữ liệu logic

### 8.1 Thực thể

Đây là mô hình logic để truy vết yêu cầu, không phải database schema. Tên thực thể và các chi tiết ở cột `TBD` là nhãn khái niệm/câu hỏi thiết kế, không phải schema hoặc field đã được phê duyệt.

| Thực thể          | Mục đích                                                            | Quan hệ/ràng buộc tối thiểu                                                       | Chi tiết TBD                                         |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| SourceImage         | Ảnh đầu vào của một job.                                         | Mỗi job có đúng một ảnh nguồn; không được ghi nội dung vào analytics/log. | ID, metadata, storage, retention, EXIF/normalization. |
| ConsentState | Thể hiện việc người dùng đã xác nhận quyền sử dụng ảnh trong flow hiện tại. | Phải ở trạng thái đã xác nhận trước submit; việc lưu bằng chứng là `TBD-012`/`TBD-028`. | Nội dung, version, persistence, timestamp, owner, retention. |
| ValidationResult    | Kết quả kiểm tra kỹ thuật, chủ thể, chất lượng và an toàn. | Có pass/fail và reason an toàn.                                                     | Schema, code, score/threshold.                        |
| GenerationJob       | Theo dõi một lần tạo.                                              | Gắn một source; có progress và terminal outcome.                                   | ID, enum, event, retry/idempotency, ownership.        |
| ModerationDecision  | Kết quả kiểm duyệt input/output.                                   | Output chưa pass không được hiển thị/lưu/share.                                | Taxonomy, score, model/version, evidence.             |
| StickerVariant      | Một output trong bộ.                                                 | Full-set success có đúng 8 variant; dùng Chibi 3D và catalog cố định.          | Format, size, text mapping, checksum, expiration.     |
| StickerSet          | Nhóm output của một job.                                            | Có đúng 8 output khi full-set success; trạng thái riêng tư mặc định.         | Pack name, cover, order, version.                     |
| SavedSelection      | Tập variant người dùng chọn để lưu.                            | Chỉ chứa item được chọn.                                                         | Min/max selection, destination, persistence.          |
| AbuseReport         | Báo cáo lạm dụng nếu flow được duyệt.                         | Gắn resource/category và phục vụ review/takedown.                                  | Toàn bộ contract: `TBD-016`.                       |
| AnalyticsEvent      | Metadata sản phẩm.                                                   | Không chứa nội dung ảnh nguồn/output.                                             | Schema, ID, retention, deduplication.                 |

### 8.2 Ownership và quyền truy cập

- Sticker/bộ sticker đã lưu phải riêng tư mặc định.
- Source, intermediate và output phải tuân theo least privilege.
- Cách xác định owner khi app có hoặc không có tài khoản là `TBD-012`.
- Route/file reference/output URL, nếu có, không được cho phép truy cập chéo owner; đây là cách áp dụng NFR-SEC-002, còn cơ chế cụ thể phụ thuộc `TBD-012` và `TBD-013`.
- Quyền của nhân sự vận hành và dịch vụ đối với ảnh phải được giới hạn theo mục đích được phê duyệt; mô hình quyền là `TBD-013`.

### 8.3 Vòng đời dữ liệu

| Loại dữ liệu               | Mục đích                             | Có được đưa vào analytics/log không?                        | Retention/xóa                                                |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Ảnh nguồn                   | Validation và generation               | Không được đưa nội dung ảnh vào analytics/application log. | `TBD-004`                                                   |
| Ảnh trung gian               | Tách nền/generation/post-processing   | Không được lộ reference nhạy cảm.                            | `TBD-004`                                                   |
| Job thất bại                | Khôi phục, debug an toàn hoặc retry | Chỉ metadata không nhạy cảm nếu được duyệt.                | `TBD-004`                                                   |
| Output chưa lưu/preview     | Preview, chọn và retry save           | Không đưa nội dung ảnh vào analytics.                         | `TBD-004`, `TBD-020`                                      |
| Tập sticker đã lưu       | Lưu các item được chọn; hành vi truy cập lại/chia sẻ là TBD | Chỉ metadata được duyệt. | `TBD-004`, `TBD-010`, `TBD-011`, `TBD-018` |
| Bằng chứng report           | Review/takedown                         | Chỉ theo policy và quyền truy cập được duyệt.               | `TBD-004`, `TBD-016`                                      |
| Analytics metadata            | Đo hiệu quả/safety                   | Không chứa nội dung ảnh.                                        | `TBD-017`                                                   |
| Bản sao đã share ra ngoài | Do OS/app nhận quản lý               | Nằm ngoài analytics nội dung của app.                           | Nằm ngoài quyền xóa của Duhat Gen Sticker sau bàn giao. |

### 8.4 Xóa dữ liệu

Người dùng phải xóa được dữ liệu sticker đã lưu theo đơn vị xóa được duyệt. Những nội dung sau chưa được xác định:

- xóa từng sticker hay cả bộ;
- xóa mềm hay xóa cứng;
- SLA xóa ở local storage, backend, object storage và cache/CDN;
- backup, disaster recovery và legal hold;
- xử lý job/ảnh nguồn/output liên quan;
- hành vi của lịch sử analytics sau xóa;
- thông báo hoặc xác nhận xóa.

Các quyết định này thuộc `TBD-004` và `TBD-018`.

## 9. Hợp đồng input và output

### 9.1 Input contract

| Thuộc tính             | Yêu cầu hiện tại                                         | Giá trị chưa chốt                                        |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Số ảnh                 | Chính xác 1 ảnh cho mỗi job                              | —                                                           |
| Nguồn                   | Camera hoặc thư viện thiết bị                           | Permission UX: `TBD-022`                                    |
| Chủ thể                | Chính xác 1 người, 1 thú cưng hoặc 1 vật thể chính | Boundary ảnh hỗn hợp/hậu cảnh: `TBD-008`               |
| Ảnh người             | Chính xác 1 khuôn mặt rõ                                | Detector, threshold, liveness/identity semantics: `TBD-008` |
| Định dạng             | Phải thuộc danh sách được hỗ trợ                     | Danh sách MIME/format: `TBD-008`                           |
| Dung lượng             | Phải dưới giới hạn được duyệt                       | `TBD-008`                                                  |
| Độ phân giải tối thiểu | Phải đáp ứng ngưỡng tối thiểu được duyệt        | `TBD-008`                                                  |
| Chất lượng            | Kiểm tra blur, ánh sáng, visibility                       | Metric/threshold: `TBD-008`                                 |
| An toàn                 | Phải pass moderation đầu vào                             | Taxonomy/threshold/manual review: `TBD-006`, `TBD-013`    |
| Consent                  | Người dùng xác nhận quyền sử dụng trước submit     | Copy/version/evidence: `TBD-012`, `TBD-028`               |

Một face detector, nếu được chọn, không được mặc định mô tả là xác minh danh tính, liveness hoặc quyền sử dụng ảnh nếu giải pháp thực tế không cung cấp và kiểm thử các khả năng đó.

### 9.2 Output contract

| Thuộc tính                 | Yêu cầu hiện tại                                                            | Giá trị chưa chốt                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Số lượng full-set success | Chính xác 8 sticker                                                           | Hành vi partial moderation: `TBD-006`                                   |
| Style                        | Chibi 3D cố định                                                             | Visual style specification/golden reference: `TBD-001`, `TBD-009`      |
| Hình thức                  | Phi thực tế, phù hợp làm sticker trò chuyện                              | Quality rubric: `TBD-009`                                                |
| Biểu cảm/câu chữ         | Catalog cố định được Product duyệt, hỗ trợ tiếng Việt và tiếng Anh | Nội dung/mapping/font/language behavior: `TBD-001`, `TBD-002`         |
| Nhận diện                  | Giữ nhận diện người hoặc đặc điểm chính của pet/vật thể           | Metric/threshold/dataset: `TBD-009`                                      |
| Tông da/tuổi/đặc điểm  | Không thay đổi ngoài ý muốn                                               | Metric/threshold/dataset: `TBD-009`                                      |
| Cutout                       | Đường cắt sạch                                                             | Metric/threshold: `TBD-009`                                              |
| Nền                         | Trong suốt hoặc nền được Product phê duyệt                              | Lựa chọn cuối: `TBD-009`                                              |
| File                         | Phù hợp với lưu và native share sheet                                      | Format, MIME, dimensions, max bytes, color/alpha: `TBD-009`, `TBD-011` |
| An toàn                     | Pass moderation trước display/save/share                                      | Taxonomy/threshold: `TBD-006`, `TBD-013`                               |

### 9.3 Quality gate

Quality gate phải đánh giá tối thiểu các nhóm mà PRD yêu cầu:

- độ giống/nhận diện đối với người;
- đặc điểm thị giác chính đối với thú cưng/vật thể;
- thay đổi không mong muốn về tông da, sắc tộc, giới tính, tuổi và đặc điểm cốt lõi;
- chất lượng đường cắt/nền;
- độ dễ đọc và tính chính xác của câu chữ;
- an toàn nội dung;
- tính đa dạng thích hợp giữa 8 sticker.

Dataset, phương pháp chấm, ngưỡng pass/fail, automated/manual review và hành vi reject là `TBD-009`.

## 10. Yêu cầu phi chức năng

### 10.1 Chất lượng

| ID          | Yêu cầu                                                                                                                                 | Trạng thái                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| NFR-QLT-001 | Sticker người phải giữ nhận diện có thể nhận biết xuyên suốt bộ 8 theo metric và ngưỡng được Product duyệt. | Confirmed; metric/threshold `TBD-009` |
| NFR-QLT-002 | Sticker thú cưng/vật thể phải giữ các đặc điểm thị giác chính của chủ thể nguồn theo rubric và ngưỡng được Product duyệt. | Confirmed; rubric/threshold `TBD-009` |
| NFR-QLT-003 | Sticker phải có đường cắt sạch, câu chữ dễ đọc khi item có câu chữ, và nền theo output contract được duyệt. | Confirmed; threshold/contract `TBD-009` |
| NFR-QLT-004 | Đánh giá phải bao phủ tông da và các nhóm nhân khẩu học đại diện theo dataset được Product phê duyệt. | Confirmed; dataset `TBD-009` |
| NFR-QLT-005 | Hệ thống phải hạn chế thay đổi ngoài ý muốn về tông da, sắc tộc, giới tính, tuổi và đặc điểm nhận dạng cốt lõi theo metric/ngưỡng được duyệt. | Confirmed; metric/threshold `TBD-009` |

### 10.2 Hiệu năng và khả năng phục hồi

| ID           | Yêu cầu                                                                                 | Trạng thái                    |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------- |
| NFR-PERF-001 | Job phải có trạng thái tiến trình rõ, timeout và khả năng retry.                | Confirmed; `TBD-007`, `TBD-014` |
| NFR-PERF-002 | Mục tiêu latency định lượng phải được phê duyệt sau benchmarking prototype.   | TBD; `TBD-007`                   |
| NFR-REL-001  | Điều hướng khỏi màn hình generation không được âm thầm hủy job đã submit. | Confirmed                       |
| NFR-REL-002  | Failure không được tạo saved partial set.                                            | Confirmed                       |
| NFR-REL-003  | Save failure phải giữ preview đủ để retry theo thời gian được duyệt.           | Confirmed; `TBD-020`            |
| NFR-REL-004  | Availability, concurrency, throughput, capacity và rate limit là `TBD-025`.            | TBD                             |
| NFR-REL-005  | RPO, RTO, backup và disaster recovery là `TBD-025`.                                    | TBD                             |

### 10.3 Bảo mật

| ID          | Yêu cầu                                                                                                                                            | Trạng thái                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| NFR-SEC-001 | Ảnh phải được mã hóa khi truyền và khi lưu trong bất kỳ thời gian retention tạm thời nào được duyệt.                             | Confirmed; `TBD-013`          |
| NFR-SEC-002 | Truy cập ảnh nguồn, ảnh trung gian và output phải theo least privilege.                                                                        | Confirmed; `TBD-012`, `TBD-013` |
| NFR-SEC-003 | Nội dung và tham chiếu ảnh nhạy cảm không được xuất hiện trong client-visible log hoặc analytics. | Confirmed |
| NFR-SEC-004 | Vị trí thực thi lớp validation authoritative và cách ngăn request bỏ qua kiểm tra phía client phải được xác định cùng kiến trúc. | TBD; `TBD-013` |
| NFR-SEC-005 | Cách quản lý secret/token của các dịch vụ, nếu kiến trúc sử dụng chúng, phải được xác định trong thiết kế bảo mật. | TBD; `TBD-013` |

NFR-SEC-004 và NFR-SEC-005 ghi nhận quyết định kỹ thuật còn thiếu, không khẳng định backend, secret hoặc token cụ thể đã tồn tại.

### 10.4 Quyền riêng tư

| ID          | Yêu cầu                                                                                                                                                           | Trạng thái                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| NFR-PRI-001 | Ảnh nguồn không được đưa vào product analytics hoặc application logs.                                                                                     | Confirmed                         |
| NFR-PRI-002 | Bộ sticker đã lưu phải riêng tư mặc định.                                                                                                                 | Confirmed; `TBD-010`, `TBD-012`  |
| NFR-PRI-003 | Retention của ảnh nguồn, ảnh trung gian, job thất bại, output và report evidence phải được Product, Privacy và Legal quyết định trước phát hành. | TBD; `TBD-004` |
| NFR-PRI-004 | Sử dụng ảnh nguồn/output cho model training yêu cầu policy rõ ràng cùng notice/consent phù hợp.                                                          | Confirmed; `TBD-004`, `TBD-028`   |
| NFR-PRI-005 | Người dùng phải có khả năng xóa dữ liệu sticker đã lưu theo đơn vị xóa được duyệt. | Confirmed; deletion semantics TBD |
| NFR-PRI-006 | Có truyền ảnh tới bên thứ ba hay không và yêu cầu notice/consent tương ứng phải được Product, Privacy và Legal xác định sau khi chốt kiến trúc. | TBD; `TBD-013`, `TBD-028` |

### 10.5 Tương thích và trải nghiệm mobile

| ID           | Yêu cầu                                                                                                    | Trạng thái                    |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| NFR-COMP-001 | Ứng dụng phải chạy trên Android và iOS.                                                                | Confirmed                       |
| NFR-COMP-002 | Phiên bản OS, device matrix, screen-size matrix và hành vi tablet là `TBD-015`.                        | TBD                             |
| NFR-ACC-001  | Chuẩn accessibility, screen reader, dynamic text, contrast, reduced motion và touch-target là `TBD-026`. | TBD                             |
| NFR-L10N-001 | Nội dung sticker cố định phải hỗ trợ tiếng Việt và tiếng Anh.                                     | Confirmed; `TBD-001`, `TBD-002` |
| NFR-L10N-002 | Ngôn ngữ giao diện ứng dụng, fallback font và xử lý dấu tiếng Việt là `TBD-026`.                | TBD                             |
| NFR-MOB-001  | Mục tiêu battery, memory, network usage và storage footprint là `TBD-027`.                              | TBD                             |
| NFR-MOB-002  | Hành vi offline, mạng yếu và chuyển mạng là `TBD-024`.                                               | TBD                             |

### 10.6 Observability và analytics

| ID          | Yêu cầu                                                                                                                                                                      | Trạng thái                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| NFR-OBS-001 | Hệ thống phải cho phép đo Generation Completion Rate và Generation-to-Save Rate bằng metadata không chứa nội dung ảnh. | Confirmed; schema/denominator `TBD-017` |
| NFR-OBS-002 | Việc đo regeneration, validation failure, safety block/report và reuse 7 ngày phải được quyết định trong analytics plan. | TBD; `TBD-017` |
| NFR-OBS-003 | “Send rate per conversation” không áp dụng. Metric share initiation/completion là `TBD-017`.                                                                            | TBD                               |
| NFR-OBS-004 | Operational monitoring, alerting, audit trail và retention là `TBD-025`.                                                                                                    | TBD                               |

## 11. Trust, Safety và Compliance

### 11.1 Consent và nhận diện

- Người dùng phải xác nhận sở hữu hoặc có quyền sử dụng ảnh trước generation.
- Ảnh người chỉ được chấp nhận khi có đúng một khuôn mặt rõ trong V1.
- Mạo danh, lừa đảo, quấy rối, tình dục hóa hoặc lạm dụng người khác bị cấm.
- Hình ảnh người nổi tiếng và nhân vật công cộng nằm ngoài phạm vi; phải bị chặn khi phát hiện đáng tin cậy hoặc được xử lý qua moderation/report flow.
- Face count không mặc định đồng nghĩa với xác minh danh tính, liveness, consent hoặc số người toàn ảnh; năng lực thực tế phải được mô tả đúng theo giải pháp được chọn.

### 11.2 An toàn nội dung

- Ảnh nguồn phải được kiểm tra đối với nội dung khiêu dâm, bóc lột, lạm dụng hoặc bất hợp pháp bị cấm.
- Output hình ảnh và câu chữ phải được kiểm duyệt trước display/save/share.
- Output không an toàn hoặc lạm dụng phải bị chặn.
- Taxonomy, model/vendor, threshold, precision/recall target, false-positive handling và manual review là `TBD-006`/`TBD-013`.

### 11.3 An toàn trẻ em

- Nội dung không an toàn hoặc tình dục hóa liên quan đến trẻ vị thành niên phải bị chặn.
- Product và Legal phải quyết định một trong hai hướng trước phát hành:
  - chặn hoàn toàn ảnh của trẻ vị thành niên trong V1; hoặc
  - cho phép theo các quy tắc riêng tư nghiêm ngặt hơn.
- SRS không chọn thay giữa hai phương án. Quyết định được theo dõi bằng `TBD-003`.

### 11.4 Định kiến và độ trung thực nhận diện

- Hệ thống phải tránh thay đổi ngoài ý muốn về tông da, sắc tộc, giới tính, tuổi và đặc điểm nhận dạng cốt lõi.
- Đánh giá phải bao phủ tông da và nhóm nhân khẩu học đại diện.
- Cơ chế để người dùng báo cáo “Không giống tôi” hoặc kết quả không chính xác thuộc `TBD-016`.

### 11.5 Báo cáo và takedown

PRD yêu cầu report/takedown trước khi ra mắt, trong khi phạm vi mới là app độc lập và không có recipient-side action menu của DUHAT. Product phải xác định:

- ai có thể report và report từ đâu;
- resource nào được report;
- category, evidence và trạng thái review;
- kênh hỗ trợ ngoài app hoặc trong app;
- takedown đối với output đã lưu và giới hạn đối với bản đã share ra ngoài;
- SLA, escalation và appeal;
- retention bằng chứng.

Toàn bộ thuộc `TBD-016`; readiness của workflow là release blocker.

## 12. Analytics và chỉ số

### 12.1 Event logic được phép xem xét

Các event sau có thể được ghi dưới dạng metadata không chứa nội dung ảnh:

- mở luồng tạo;
- xác nhận consent;
- chọn camera hoặc thư viện;
- validation pass/fail theo reason category không nhạy cảm;
- generation started/completed/failed/timed out;
- regenerate;
- sticker selected/deselected;
- save succeeded/failed;
- delete;
- report, nếu flow được duyệt;
- native share sheet invoked, nếu Product/Privacy phê duyệt semantics.

Khả năng native share sheet cung cấp tín hiệu completion nào và cách diễn giải tín hiệu đó trong analytics là `TBD-017`; SRS chưa coi việc mở hoặc đóng share sheet là bằng chứng gửi thành công.

### 12.2 Chỉ số đề xuất từ PRD

| Chỉ số                                     | Trạng thái trong app standalone                                     |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Generation Completion Rate                   | Giữ; denominator và event schema `TBD-017`.                        |
| Generation-to-Save Rate                      | Giữ; phụ thuộc storage model.                                      |
| Generated Sticker Send Rate per Conversation | Loại bỏ vì không có chat; metric share thay thế là `TBD-017`. |
| Seven-day Reuse Rate                         | `TBD-017`, phụ thuộc khả năng nhận diện việc tái sử dụng. |
| Regeneration Rate                            | Giữ; denominator `TBD-017`.                                         |
| Validation Failure Rate                      | Giữ; reason taxonomy `TBD-008`, `TBD-017`.                        |
| Safety Block and Report Rate                 | Giữ; phụ thuộc moderation/report contract.                         |

## 13. Tiêu chí chấp nhận và verification

### 13.1 Tiêu chí chấp nhận cấp sản phẩm

| ID | Given | When | Then | Blocker/TBD |
| --- | --- | --- | --- | --- |
| AC-001 | Ứng dụng được cài trên nền tảng được hỗ trợ | Người dùng mở app | Duhat Gen Sticker hoạt động như app độc lập, không cần đi qua DUHAT | OS matrix `TBD-015` |
| AC-002 | Người dùng chưa xác nhận quyền sử dụng ảnh | Người dùng yêu cầu tạo | Hệ thống không submit generation | Consent copy/evidence `TBD-012`, `TBD-028` |
| AC-003 | Quyền camera/thư viện được cấp | Người dùng chọn nguồn ảnh | Có thể chụp hoặc chọn đúng một ảnh | Input contract `TBD-008` |
| AC-004 | Ảnh không đạt validation | Validation kết thúc | Ảnh bị từ chối, người dùng ở lại flow và có thể chọn ảnh khác | `TBD-008`, `TBD-021` |
| AC-005 | Ảnh người có nhiều người hoặc không có đúng một khuôn mặt rõ | Validation chạy | Ảnh bị từ chối; trường hợp nhiều người có hướng dẫn crop/chọn ảnh khác | `TBD-008` |
| AC-006 | Ảnh có đúng một pet hoặc vật thể chính hợp lệ | Validation chạy | Ảnh có thể đi tiếp nếu vượt tất cả quality/safety gate | `TBD-008` |
| AC-007 | Ảnh đã consent và pass validation | Người dùng chủ động bấm tạo | Job mới được submit và UI hiển thị progress | `TBD-014` |
| AC-008 | Job đã submit thành công | Người dùng điều hướng khỏi màn hình rồi quay lại | Job không bị âm thầm hủy hoặc mất | App kill/restart `TBD-014` |
| AC-009 | Job vượt tất cả input/output gate | Job hoàn thành | Preview có đúng 8 sticker Chibi 3D | `TBD-001`, `TBD-002`, `TBD-009` |
| AC-010 | Output chưa được moderation hoặc đã bị block | Người dùng cố xem/lưu/share | Output không được hiển thị, lưu hoặc chia sẻ | `TBD-006` |
| AC-011 | Preview hợp lệ | Người dùng chọn/bỏ chọn item | Tập sẽ lưu phản ánh đúng lựa chọn | `TBD-019` |
| AC-012 | Preview hợp lệ | Người dùng regenerate | Toàn bộ bộ được tạo lại từ cùng source và Chibi 3D; không tạo lại riêng item | `TBD-005` |
| AC-013 | Một số sticker bị bỏ chọn | Người dùng lưu | Chỉ sticker được chọn được lưu và dữ liệu không tự public | `TBD-010` |
| AC-014 | Thao tác lưu trả lỗi | Người dùng thực hiện save | Preview vẫn tồn tại và có hành động retry save | `TBD-020` |
| AC-015 | Generation thất bại hoặc quá giờ | Job kết thúc | Không có saved partial set; có lỗi không chặn và hành động retry | `TBD-007`, `TBD-014` |
| AC-016 | Output đủ điều kiện chia sẻ | Người dùng chọn Share | Native share sheet Android/iOS được gọi; không dùng DUHAT chat/tray | `TBD-011` |
| AC-017 | Share sheet được mở hoặc đóng | Hệ thống xử lý analytics liên quan | Trạng thái/event chỉ được ghi theo semantics đã phê duyệt | `TBD-017` |
| AC-018 | Có dữ liệu sticker đã lưu | Người dùng yêu cầu xóa | Dữ liệu được xóa theo policy được duyệt | `TBD-018` |
| AC-019 | Analytics/logging được bật | Thực hiện toàn bộ happy/error flow | Analytics không chứa nội dung ảnh nguồn/output; application log không chứa ảnh nguồn; client-visible log/analytics không chứa reference ảnh nhạy cảm | `TBD-017` |
| AC-020 | Bộ benchmark đại diện đã được phê duyệt | Chạy đánh giá output | Identity, cutout, text khi áp dụng, safety, bias và diversity đạt ngưỡng được duyệt | `TBD-009` |
| AC-021 | Flow báo cáo đã được phê duyệt và có output cần báo cáo | Actor dùng entry point được duyệt | Flow hỗ trợ các nhóm lý do tại FR-REP-001 và chuyển report vào quy trình review/takedown | `TBD-016` |
| AC-022 | Quyền camera/thư viện bị từ chối, giới hạn hoặc thu hồi | Người dùng đi vào luồng chọn ảnh | Ứng dụng thực hiện đúng UX khôi phục đã được duyệt và không truy cập ngoài quyền hệ điều hành cấp | `TBD-022` |
| AC-023 | Input vi phạm chính sách an toàn | Kiểm duyệt đầu vào hoàn tất | Generation không bắt đầu và UI chỉ hiển thị lý do an toàn đã được duyệt | `TBD-006`, `TBD-021` |
| AC-024 | Người dùng ở luồng V1 | Người dùng thao tác tạo/preview | Không có prompt tự do, style selector, per-item regenerate/edit; người dùng vẫn xem được từng sticker | — |
| AC-025 | Ảnh nguồn đã được chọn | Người dùng chưa chủ động lưu/share output | Ảnh nguồn không tự động được public hoặc chia sẻ cho người dùng khác | `TBD-010`, `TBD-012` |
| AC-026 | Ảnh có đúng một người với đúng một khuôn mặt rõ | Validation chạy | Ảnh có thể đi tiếp nếu vượt tất cả quality/safety gate | `TBD-008` |

### 13.2 Ma trận SRS → acceptance criteria

Ma trận dưới dùng ID chính xác. Yêu cầu chưa có AC thực thi vì còn `TBD` được truy vết tới decision tương ứng thay vì tạo kết quả kiểm thử giả định.

| Nhóm SRS/Interface ID | Acceptance criteria / quyết định chặn |
| --- | --- |
| AF-01 | AC-022; TBD-022 |
| AF-02 | AC-004; TBD-008; TBD-021 |
| AF-03 | AC-004; AC-005; AC-006; AC-026; TBD-008 |
| AF-04 | AC-005; TBD-008 |
| AF-05 | AC-023; TBD-006; TBD-021 |
| AF-06 | AC-015; TBD-007; TBD-014 |
| AF-07 | AC-010; TBD-006 |
| AF-08 | AC-008; TBD-014 |
| FR-ENT-001, NFR-COMP-001 | AC-001 |
| FR-ENT-002 | AC-001; content review |
| FR-CNS-001, FR-CNS-002, FR-CNS-003, BR-004 | AC-002; TBD-004; TBD-012; TBD-028 |
| FR-INP-001, FR-INP-002 | AC-003 |
| FR-INP-003, FR-INP-004 | AC-022; TBD-022 |
| FR-INP-005 | AC-025 |
| FR-VAL-001, FR-VAL-005, FR-VAL-006, FR-ERR-001 | AC-004 |
| FR-VAL-002, FR-VAL-003, FR-VAL-004, BR-002, BR-003 | AC-005; AC-006; AC-026 |
| FR-SAFE-001 | AC-023 |
| FR-SAFE-002, FR-SAFE-003, FR-SAFE-004, BR-009, BR-010 | AC-010; TBD-006 |
| FR-GEN-001, FR-GEN-008 | AC-007 |
| FR-GEN-002, FR-GEN-003, FR-GEN-004, FR-GEN-005, BR-005, BR-006, BR-007, BR-008 | AC-009; AC-020; TBD-001; TBD-002; TBD-009 |
| FR-GEN-006, FR-GEN-007 | AC-024 |
| FR-GEN-009, NFR-REL-001 | AC-008; TBD-014 |
| FR-PRV-001 | AC-009 |
| FR-PRV-002 | AC-024 |
| FR-SEL-001, FR-SEL-002 | AC-011; TBD-019 |
| FR-REG-001, FR-REG-002, FR-REG-003, BR-013 | AC-012; TBD-005 |
| FR-SAV-001, FR-SAV-002, FR-SAV-004, BR-011 | AC-013; TBD-010; TBD-011 |
| FR-SAV-003, BR-012, NFR-PRI-002 | AC-013; AC-025 |
| FR-SAV-005, FR-ERR-003, NFR-REL-003 | AC-014; TBD-020 |
| FR-SAV-006, FR-ERR-002, BR-017, NFR-PERF-001, NFR-REL-002 | AC-015; TBD-007; TBD-014 |
| FR-DEL-001, NFR-PRI-005 | AC-018; TBD-018 |
| FR-SHR-001, FR-SHR-002, FR-SHR-003, FR-SHR-004, FR-SHR-005, BR-020 | AC-016; AC-017; TBD-011 |
| FR-ERR-004, NFR-SEC-003, NFR-PRI-001, BR-018 | AC-019 |
| FR-ERR-005 | AC-004; AC-015; AC-023; TBD-021 |
| FR-REP-001, FR-REP-002, FR-REP-003 | AC-021; TBD-016 |
| FR-ANL-001, FR-ANL-002, FR-ANL-003, FR-ANL-004, NFR-OBS-001, NFR-OBS-002, NFR-OBS-003 | AC-017; AC-019; TBD-017 |
| BR-001 | AC-003; AC-007 |
| BR-014, BR-021 | AC-023; TBD-006; TBD-013; TBD-023 |
| BR-015 | AC-010; AC-023 |
| BR-016, BR-022 | AC-010; AC-023; TBD-003 |
| BR-019 | TBD-004; privacy verification sau khi policy được duyệt |
| NFR-QLT-001, NFR-QLT-002, NFR-QLT-003, NFR-QLT-004, NFR-QLT-005 | AC-020; TBD-009 |
| NFR-PERF-002 | TBD-007 |
| NFR-REL-004, NFR-REL-005, NFR-OBS-004 | TBD-025 |
| NFR-SEC-001, NFR-SEC-002, NFR-SEC-004, NFR-SEC-005 | Security verification sau TBD-012 và TBD-013 |
| NFR-PRI-003, NFR-PRI-004 | TBD-004; privacy verification sau khi policy được duyệt |
| NFR-PRI-006 | TBD-013; TBD-028; privacy verification sau khi architecture/notice được duyệt |
| NFR-COMP-002 | AC-001; TBD-015 |
| NFR-ACC-001, NFR-L10N-002 | TBD-026 |
| NFR-L10N-001 | AC-009; TBD-001; TBD-002 |
| NFR-MOB-001 | TBD-027 |
| NFR-MOB-002 | TBD-024 |
| IF-OS-001, IF-OS-002 | AC-003; AC-022 |
| IF-OS-003 | AC-016; AC-017 |
| IF-OS-004 | AC-013; AC-018; TBD-010 |
| IF-OS-005 | AC-008; TBD-014 |
| IF-SVC-001 | AC-013; AC-018; TBD-012 |
| IF-SVC-002 | AC-004; AC-005; AC-006; AC-007; AC-023; AC-026; TBD-013; TBD-014 |
| IF-SVC-003, IF-SVC-004 | AC-007; AC-008; AC-015; TBD-013; TBD-014 |
| IF-SVC-005 | AC-012; TBD-005; TBD-014 |
| IF-SVC-006 | AC-010; AC-023; TBD-006; TBD-013 |
| IF-SVC-007 | AC-013; AC-018; TBD-010; TBD-018 |
| IF-SVC-008 | AC-021; TBD-016 |

### 13.3 Phạm vi verification đề xuất

PRD không xác định chiến lược, cấp độ hoặc công cụ kiểm thử; các nội dung đó được theo dõi tại `TBD-029`. Danh sách dưới đây là phạm vi verification đề xuất để lập Software Test Plan sau khi các contract liên quan được duyệt:

- kiểm thử unit cho validation/rule/state logic;
- kiểm thử contract tại boundary mobile–service–storage–moderation;
- kiểm thử integration camera, thư viện, permission và native share sheet;
- kiểm thử end-to-end happy path và mọi failure state trên Android/iOS;
- kiểm thử security/privacy về ownership, encryption và log/analytics redaction;
- kiểm thử moderation input/output và abuse cases;
- benchmark chất lượng/identity/bias trên dataset được duyệt;
- benchmark latency/timeout sau prototype;
- kiểm thử background/foreground/resume theo lifecycle policy được chốt;
- kiểm thử xóa/retention theo data lifecycle được chốt.

### 13.4 Release gate

SRS đang ở trạng thái Draft nên chưa thể dùng làm baseline phát hành. Tối thiểu, V1 chưa được coi là sẵn sàng phát hành cho đến khi:

- các mục có mốc **Trước cam kết V1** hoặc **Trước phát hành** tại Mục 15 được phê duyệt;
- catalog biểu cảm/câu chữ dùng cho 8 output và specification Chibi 3D được Product duyệt;
- policy trẻ vị thành niên được Product và Legal duyệt;
- retention/deletion/training-use được Product, Privacy và Legal duyệt;
- input/output moderation cùng report/review/takedown workflow sẵn sàng;
- ngưỡng chất lượng và latency được phê duyệt từ kết quả benchmark;
- test trên cả Android và iOS theo device/OS matrix được duyệt đạt yêu cầu;
- security/privacy review xác nhận encryption, least privilege và không lộ dữ liệu ảnh trong log/analytics;
- traceability PRD → SRS → test không còn yêu cầu bắt buộc bị bỏ sót.

Các mục có mốc `TBD` trong register không mặc nhiên là không chặn phát hành; Product phải gán mốc trước khi baseline SRS được phê duyệt.

## 14. Traceability

Ký hiệu `A..B` và `*` trong các bảng 14.1–14.3 chỉ là cách viết gọn cho người đọc. Ma trận ID chính xác tại Mục 13.2 là nguồn dùng để audit yêu cầu SRS → acceptance criteria.

### 14.1 PRD Functional Requirements → SRS

| PRD ID | Nội dung PRD                                       | SRS liên quan                             | Điều chỉnh                                                    |
| ------ | --------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| F1     | Nhận một ảnh từ camera/thư viện               | FR-INP-001..005                            | Giữ cho app mobile độc lập.                                  |
| F2     | Kiểm tra chất lượng, chủ thể và an toàn     | FR-VAL-001..006, FR-SAFE-001               | Hỗ trợ person/pet/object theo DEC-004; threshold thuộc `TBD-006`, `TBD-008`. |
| F3     | Xác nhận consent trước gửi ảnh                | FR-CNS-001..003                            | Giữ nguyên mục tiêu; evidence thuộc `TBD-028`.                |
| F4     | Tách nền và style phi thực tế cố định       | FR-GEN-002                                 | Style được chốt Chibi 3D theo DEC-006.                       |
| F5     | Tạo 6–8 biến thể với fixed expression/wording  | FR-GEN-003..005                            | Số lượng đổi thành đúng 8 theo DEC-005; catalog thuộc `TBD-001`, `TBD-002`. |
| F6     | Moderation input/output trước hiển thị/chia sẻ | FR-SAFE-001..004                           | Giữ nguyên; partial-output behavior thuộc `TBD-006`.          |
| F7     | Preview, select, regenerate, save                   | FR-PRV-*, FR-SEL-*, FR-REG-*, FR-SAV-* | Regenerate toàn bộ; storage thuộc `TBD-010`.                  |
| F8     | Thêm vào khay sticker DUHAT                       | FR-SAV-003..004                            | Thay bằng lưu riêng tư theo mô hình `TBD-010`; không giả định app-local hay backend. |
| F9     | Gửi qua messaging DUHAT                            | FR-SHR-001..005                            | Thay bằng native share sheet theo DEC-003.                      |
| F10    | Report và delete                                   | FR-DEL-001, FR-REP-001..003                | Delete giữ; report standalone flow thuộc `TBD-016`.           |

### 14.2 PRD Non-Functional/Compliance → SRS

| Nguồn PRD                       | SRS liên quan                             |
| -------------------------------- | ------------------------------------------ |
| §8.1 Consent and Identity       | FR-CNS-*, BR-004, BR-014..016, Mục 11.1   |
| §8.2 Content Safety             | FR-SAFE-*, FR-REP-*, Mục 11.2, 11.5     |
| §8.3 Child Safety               | BR-016, Mục 11.3, TBD-003                 |
| §8.4 Bias and Identity Fidelity | NFR-QLT-001..005, Mục 11.4, TBD-009       |
| §8.5 Privacy and Retention      | NFR-PRI-*, Mục 8.2..8.4, TBD-004, TBD-018 |
| §10.1 Quality                   | NFR-QLT-*, Mục 9.2..9.3                   |
| §10.2 Performance               | NFR-PERF-*, NFR-REL-*, Mục 6            |
| §10.3 Security                  | NFR-SEC-*, Mục 8.2, 8.3                   |
| §11 Analytics                   | FR-ANL-*, NFR-OBS-*, Mục 12             |
| §12 Dependencies                | Mục 2.5, 7.2, 7.3                         |
| §14 Product Decisions           | Mục 15                                    |

### 14.3 Quyết định đã xác nhận → SRS

| Decision | SRS áp dụng                                |
| -------- | -------------------------------------------- |
| DEC-001  | Mục 0.1, 0.3 và toàn bộ traceability     |
| DEC-002  | FR-ENT-001, NFR-COMP-001, Mục 2.1, 2.4      |
| DEC-003  | FR-SAV-001..004, FR-SHR-001..005, BR-020, Mục 1.2, 2.7, 3.4, 3.6, 7.2 |
| DEC-004  | FR-VAL-002..004, BR-002..003, Mục 9.1       |
| DEC-005  | FR-GEN-003, BR-005, Mục 6 và 9.2           |
| DEC-006  | FR-GEN-002, FR-GEN-006, FR-REG-001, BR-006, Mục 9.2 |
| DEC-007  | FR-GEN-004, FR-GEN-005, BR-007, TBD-001, TBD-002 |
| DEC-008  | Mục 0.5 và toàn bộ registry `TBD`       |

## 15. Danh sách quyết định chưa chốt

### 15.1 TBD register

| ID | Câu hỏi cần quyết định | Căn cứ/đầu mối được nguồn nêu | Ảnh hưởng | Mốc bắt buộc |
| --- | --- | --- | --- | --- |
| TBD-001 | Catalog biểu cảm/câu chữ Việt–Anh dùng cho 8 output và visual specification/golden reference của Chibi 3D là gì? | Product; PRD §5.1, §14.2; DEC-006, DEC-007 | Generation contract, UI, QA golden set | Trước cam kết V1 |
| TBD-002 | Ngôn ngữ câu chữ lấy theo app locale, do người dùng chọn hay theo cơ chế khác? Mỗi sticker có bắt buộc có chữ không? | Product; PRD §5.1, §14.2 | UI, font/rendering, generation contract, test | Trước cam kết V1 |
| TBD-003 | Ảnh trẻ vị thành niên bị chặn hoàn toàn hay được phép theo privacy rules nghiêm ngặt hơn? | Product và Legal; PRD §8.3, §14.3 | Validation, moderation, release policy | Trước cam kết V1 |
| TBD-004 | Retention của source, intermediate, failed job, preview, generated output và report evidence là bao lâu? Training-use policy là gì? | Product, Privacy và Legal; PRD §8.5, §14.4 | Storage, cleanup, notice/consent, deletion | Trước cam kết V1 |
| TBD-005 | Quota tạo/tạo lại, miễn phí hay giới hạn lượt và việc giữ kết quả trước khi regenerate là gì? | Product; PRD §7.4, §14.5 | UX, cost, generation policy | Trước cam kết V1 |
| TBD-006 | Nếu một phần trong 8 output fail moderation thì hiển thị phần an toàn, tạo bù để đủ 8 hay fail cả lần tạo? Thế nào là full-set success? | Product; PRD §7.6, §14.6 | Exact-8 invariant, job status, UI, safety | Trước cam kết V1 |
| TBD-007 | Metric và ngưỡng định lượng về generation latency/timeout là gì? | Product sau benchmarking; PRD §4, §10.2, §14.7 | UX, capacity, verification | Trước cam kết V1 |
| TBD-008 | MIME/format hỗ trợ, max bytes, minimum resolution, blur/light/visibility threshold và quy tắc “một chủ thể chính” là gì? | PRD §7.2/F2; đầu mối quyết định `TBD` | Input validation, error catalog, QA | `TBD` |
| TBD-009 | Output format, dimensions, max bytes, alpha/background, quality/fidelity/bias threshold, dataset và rubric là gì? | Product; PRD §10.1, §14.7 | Output/share contract, benchmark, release | Trước cam kết V1 |
| TBD-010 | Sticker được lưu ở app storage, Photos, Files hay storage gắn với account? Cấu trúc tập lưu, persistence và quota là gì? | Khoảng trống do DEC-003 thay DUHAT tray; đầu mối quyết định `TBD` | Data model, ownership, delete, reuse, offline | `TBD` |
| TBD-011 | Share từ preview hay dữ liệu đã lưu? Có cần save trước? Chia sẻ một item, nhiều item hay cả tập? Format/MIME/packaging là gì? | DEC-003; đầu mối quyết định `TBD` | Native share integration, UX, analytics, test | `TBD` |
| TBD-012 | App có yêu cầu tài khoản không? Nếu không, owner được xác định theo thiết bị thế nào? Nếu có, auth/session/recovery model là gì? | Khoảng trống của app standalone; đầu mối quyết định `TBD` | Private storage, consent, cross-device, delete, API | `TBD` |
| TBD-013 | Kiến trúc mobile/service/job/provider/storage/moderation, API contract, data region và third-party disclosure là gì? | PRD §12 không chốt công nghệ; chủ sở hữu kiến trúc `TBD` | Technical design, security/privacy review, integration test | `TBD` |
| TBD-014 | Job state/event contract, progress, polling/push, retry/backoff, background/kill/restart resume, cancel, idempotency và stale reconciliation là gì? | PRD §7.3, §10.2; đầu mối quyết định `TBD` | Reliability, API, mobile lifecycle | `TBD` |
| TBD-015 | Android/iOS minimum versions, device/screen/tablet matrix là gì? | DEC-002 chỉ chốt hai nền tảng; đầu mối quyết định `TBD` | Compatibility, release QA | `TBD` |
| TBD-016 | Report/review/takedown hoạt động thế nào trong app standalone? Ai report, report từ đâu, evidence/SLA/appeal ra sao? | PRD §8.2; đầu mối phê duyệt `TBD` | Safety operations, data retention, FR-REP | Trước phát hành |
| TBD-017 | Analytics event schema, consent, retention, deduplication, denominator và native share semantics là gì? | PRD §11; đầu mối quyết định `TBD` | KPI, privacy, instrumentation | `TBD` |
| TBD-018 | Delete là per-item/per-set, soft/hard; cascade tới source/output/cache/backup thế nào và SLA bao lâu? | PRD §8.5/F10; đầu mối quyết định `TBD` | Data lifecycle, storage, compliance | `TBD` |
| TBD-019 | Sticker mặc định được chọn hay bỏ chọn? Có cho save khi chọn 0 item không? | PRD không xác định; đầu mối quyết định `TBD` | Preview/save UX, acceptance test | `TBD` |
| TBD-020 | Preview được giữ bao lâu và ở đâu sau save failure hoặc khi người dùng rời màn hình? | PRD §7.6 chỉ yêu cầu giữ để retry; đầu mối quyết định `TBD` | Reliability, retention, storage | `TBD` |
| TBD-021 | Stable error codes, reason taxonomy, safe user copy và retryable/non-retryable mapping là gì? | PRD §7.2, §7.6; đầu mối quyết định `TBD` | UI, API, localization, support | `TBD` |
| TBD-022 | UX khi permission bị deny/limited/revoked, camera unavailable hoặc asset cloud-only là gì? | PRD §7.2; đầu mối quyết định `TBD` | Input flow, mobile QA | `TBD` |
| TBD-023 | Phân biệt vật thể hợp lệ với logo, đồ chơi, sản phẩm hoặc nhân vật có thương hiệu/bản quyền như thế nào? | PRD §5.1–§5.2; đầu mối quyết định `TBD` | Scope, validation, moderation, report | `TBD` |
| TBD-024 | Generation có yêu cầu online không? Hành vi offline, mạng yếu, chuyển mạng và resume upload/job là gì? | PRD không xác định; đầu mối quyết định `TBD` | UX, retry, data usage | `TBD` |
| TBD-025 | Availability, concurrency, throughput, rate limit, monitoring/alerting, backup, RPO và RTO là gì? | PRD không xác định; đầu mối quyết định `TBD` | SLA, architecture, cost, operations | `TBD` |
| TBD-026 | Accessibility target và ngôn ngữ UI/fallback font là gì? | PRD không xác định; đầu mối quyết định `TBD` | UI design, QA, localization | `TBD` |
| TBD-027 | Giới hạn battery, memory, network và local storage của app là gì? | PRD không xác định; đầu mối quyết định `TBD` | Performance, device compatibility | `TBD` |
| TBD-028 | Consent copy/version/evidence, thời gian lưu và notice khi chuyển dữ liệu cho bên thứ ba là gì? | PRD §7.1, §8.1, §8.5; đầu mối quyết định `TBD` | Consent UX, evidence, privacy notice, integration | `TBD` |
| TBD-029 | Chiến lược, cấp độ, môi trường và công cụ kiểm thử/verification là gì? | PRD không xác định; đầu mối quyết định `TBD` | Software Test Plan, evidence, release verification | `TBD` |

### 15.2 Mâu thuẫn/phụ thuộc cần giải quyết

1. **Đúng 8 output và partial moderation:** DEC-005 yêu cầu một lần tạo thành công có đúng 8 sticker, trong khi PRD chưa quyết định có hiển thị các output an toàn khi một số item bị chặn. `TBD-006` phải định nghĩa success/failure và UX cuối cùng; nếu hiển thị ít hơn 8 item thì trạng thái đó không được gọi là full-set success.
2. **Vật thể hợp lệ và nội dung có thương hiệu/bản quyền:** Vật thể thuộc phạm vi, nhưng nhân vật có thương hiệu/bản quyền nằm ngoài phạm vi. `TBD-023` phải xác định ranh giới đối với logo, đồ chơi và sản phẩm.
3. **Lưu riêng tư trong app độc lập:** PRD dựa vào khay sticker DUHAT, nhưng DEC-003 loại bỏ tích hợp đó. `TBD-010` và `TBD-012` phải thay thế bằng storage/ownership model cụ thể.
4. **Report từ app standalone:** PRD giả định action menu của sticker trong hệ sinh thái DUHAT. `TBD-016` phải xác định kênh report phù hợp mà không mô tả một tính năng chưa tồn tại.
5. **Nền output:** PRD vừa yêu cầu tách nền vừa cho phép nền trong suốt hoặc nền được Product duyệt. `TBD-009` phải chốt output contract.

## 16. Phê duyệt

| Vai trò                 | Người phê duyệt | Trạng thái      | Ngày |
| ------------------------ | ------------------- | ----------------- | ----- |
| Product                  | TBD                 | Chưa phê duyệt | TBD   |
| Privacy                  | TBD                 | Chưa phê duyệt | TBD   |
| Legal                    | TBD                 | Chưa phê duyệt | TBD   |
| Trust & Safety           | TBD                 | Chưa phê duyệt | TBD   |
| Engineering/Architecture | TBD                 | Chưa phê duyệt | TBD   |
| QA                       | TBD                 | Chưa phê duyệt | TBD   |

---

**Nguyên tắc cập nhật:** Khi một `TBD` được chốt, phải cập nhật đồng thời requirement liên quan, acceptance criteria, data/interface contract, traceability và release gate. Không được chỉ thay giá trị trong một mục riêng lẻ.
