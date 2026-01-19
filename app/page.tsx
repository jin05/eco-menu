'use client'

import { useState } from 'react'
import ImageUploader from '@/components/ImageUploader'
import RecipeCard, { ShoppingList, RecipeCardSkeleton } from '@/components/RecipeCard'
import { GenerateMenuResponse, AnalyzeImageResponse } from '@/lib/openai'

type Step = 'upload' | 'ingredients' | 'menu'

export default function Home() {
  const [step, setStep] = useState<Step>('upload')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<string[]>([])
  const [newIngredient, setNewIngredient] = useState('')
  const [menuResult, setMenuResult] = useState<GenerateMenuResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 画像解析
  const analyzeImage = async () => {
    if (!imageBase64) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '画像解析に失敗しました')
      }

      const data: AnalyzeImageResponse = await res.json()
      setIngredients(data.ingredients)
      setStep('ingredients')
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 献立生成
  const generateMenu = async () => {
    if (ingredients.length === 0) return

    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          history: [], // 実際にはSupabaseから取得
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '献立生成に失敗しました')
      }

      const data: GenerateMenuResponse = await res.json()
      setMenuResult(data)
      setStep('menu')
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  // 食材を追加
  const addIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()])
      setNewIngredient('')
    }
  }

  // 食材を削除
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  // 最初からやり直し
  const reset = () => {
    setStep('upload')
    setImageBase64(null)
    setIngredients([])
    setMenuResult(null)
    setError(null)
  }

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {['upload', 'ingredients', 'menu'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                transition-colors duration-300
                ${step === s || ['upload', 'ingredients', 'menu'].indexOf(step) > i
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={`w-12 h-1 mx-1 rounded transition-colors duration-300 ${
                  ['upload', 'ingredients', 'menu'].indexOf(step) > i
                    ? 'bg-green-600'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Image Upload */}
      {step === 'upload' && (
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">食材を撮影しよう</h2>
            <p className="text-gray-600 mt-2">
              冷蔵庫の中身やレシートを撮影して、AIが食材を認識します
            </p>
          </div>

          <ImageUploader
            onImageSelect={setImageBase64}
            disabled={isAnalyzing}
          />

          {imageBase64 && (
            <button
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-xl
                hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  AIが解析中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  食材を解析する
                </>
              )}
            </button>
          )}

          {/* Manual input option */}
          <div className="text-center">
            <button
              onClick={() => setStep('ingredients')}
              className="text-green-600 hover:text-green-700 underline text-sm"
            >
              または、手動で食材を入力する
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Ingredients List */}
      {step === 'ingredients' && (
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">食材リストを確認</h2>
            <p className="text-gray-600 mt-2">
              必要に応じて追加・削除してください
            </p>
          </div>

          {/* Add ingredient form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
              placeholder="食材を追加（例: トマト）"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl
                focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
            <button
              onClick={addIngredient}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl
                hover:bg-green-700 transition-colors"
            >
              追加
            </button>
          </div>

          {/* Ingredients tags */}
          <div className="min-h-[100px] p-4 bg-white border border-gray-200 rounded-xl">
            {ingredients.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ingredient, i) => (
                  <span
                    key={i}
                    className="group flex items-center gap-1 px-3 py-2 bg-green-100 text-green-800
                      rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
                  >
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(i)}
                      className="ml-1 w-4 h-4 rounded-full bg-green-300 text-green-700
                        hover:bg-red-400 hover:text-white transition-colors
                        flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                食材がありません。上のフォームから追加してください。
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl
                hover:bg-gray-200 transition-colors"
            >
              戻る
            </button>
            <button
              onClick={generateMenu}
              disabled={ingredients.length === 0 || isGenerating}
              className="flex-[2] py-3 bg-orange-500 text-white text-lg font-bold rounded-xl
                hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  献立を考え中...
                </>
              ) : (
                <>
                  <span className="text-xl">🍽️</span>
                  献立を作成する
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Generated Menu */}
      {step === 'menu' && (
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              🎉 3日分の献立ができました！
            </h2>
            <p className="text-gray-600 mt-2">
              食材を無駄なく使い切るメニューです
            </p>
          </div>

          {/* Loading skeleton */}
          {isGenerating && (
            <div className="grid md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Menu cards */}
          {menuResult && (
            <>
              <div className="grid md:grid-cols-3 gap-6">
                {menuResult.days.map((day, i) => (
                  <RecipeCard key={day.day} menu={day} index={i} />
                ))}
              </div>

              <ShoppingList items={menuResult.shopping_list} />
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep('ingredients')}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl
                hover:bg-gray-200 transition-colors"
            >
              食材を編集
            </button>
            <button
              onClick={reset}
              className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl
                hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              最初からやり直す
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
