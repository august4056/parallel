class TweetsController < ApplicationController

  before_action :authenticate_user!, only: :show

  def index
    @tweet = Tweet.new
    @tweets = Tweet.includes(:user).order("created_at DESC").page(params[:page]).per(5)
  end
  
  def new
    @tweet = Tweet.new
  end

  def create
    @tweet = Tweet.create(post_params)
    redirect_to root_path, notice: "投稿したよ" 
  end

  def show
    post = Tweet.find(params[:id])
    @user = post
    @tweets = Tweet.includes(:user).order("created_at DESC").page(params[:page]).per(5)
  end

  private

  def post_params
    params.require(:tweet).permit(:title, :text, :image, :file).merge(user_id: current_user.id)
  end

end
