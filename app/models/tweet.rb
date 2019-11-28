class Tweet < ApplicationRecord
  validates :title, presence: true
  belongs_to :user

  mount_uploader :image, ImageUploader
end
